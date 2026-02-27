# Requirement: Scheduling Gerarchico Multi-Livello

## 1. Problema Attuale

Attualmente, il sistema implementa uno schema di scheduling **piatto a livello di utente**:
- Ogni utente definisce **un unico schedule globale** (ad es: 9:00-17:00, lun-ven)
- Tutte le task dell'utente vengono programmate automaticamente **sempre** utilizzando questo schedule
- Non esiste differenziazione tra progetti o task individuali
- Mancano le gerarchie e i contesti specifici di programmazione

**Limitazioni:**
- Un utente che lavora su progetti con orari diversi non può mappare task a orari specifici
- Non è possibile definire "giorni di lavoro" diversi per progetto
- Le eccezioni durante auto-scheduling non hanno granularità

## 2. Stato Desiderato: Scheduling a Cascata

Implementare un sistema di **scheduling gerarchico** con 3 livelli, dove ogni livello eredita dalla configurazione del livello superiore, ma può essere sovrascritto:

```
User Schedule (livello base) ← Template globale (di default, fallback)
    ↓ (eredita se non specificato)
Project Schedule (specifico per progetto) ← Può sovrascrivere lo schedule dell'utente
    ↓ (eredita se non specificato)
Task Schedule (specifico per task) ← Può sovrascrivere lo schedule del progetto
```

### 2.1 Livello 1: User Schedule (Global)
- **Descrizione**: Schedule di default definito a livello di utente
- **Attributi aggiuntivi** (v.s Schema di Base):
  - `schedule_id` (FK → schedule table)
  - `is_default`: boolean (indica se usato come fallback)
- **Comportamento**: Applicato a tutte le task dell'utente che non hanno project/task schedule esplicito
- **Use cases**:
  - Dipendente standard 9-17, lun-ven
  - Utilizzato come foglia di caduta quando progetti/task non definiscono il loro schedule

### 2.2 Livello 2: Project Schedule
- **Descrizione**: Schedule specifico per un singolo progetto
- **Nuova tabella da creare**: `project_schedules`
  - `id`: UUID (PK)
  - `project_id`: UUID (FK → projects)
  - `schedule_id`: UUID (FK → schedule)
  - `effective_from`: timestamp
  - `effective_to`: timestamp (nullable, se null = infinito)
  - `created_at`, `updated_at`
- **Comportamento**:
  - Se presente e attivo (entro date di validità), **sovrascrive** il user schedule per task del progetto
  - Se non presente o inattivo, **eredita** il user schedule
  - Permette project manager di definire orari di lavoro specifici (es: team dedicato con turni diversi)
- **Use cases**:
  - Progetto A: 8:00-16:00 (turno mattina)
  - Progetto B: 14:00-22:00 (turno sera)
  - Progetto C: 24/7 deployment (ogni giorno)

### 2.3 Livello 3: Task Schedule
- **Descrizione**: Schedule specifico per una singola task
- **Nuova tabella da creare**: `task_schedules`
  - `id`: UUID (PK)
  - `task_id`: UUID (FK → tasks)
  - `schedule_id`: UUID (FK → schedule)
  - `effective_from`: timestamp
  - `effective_to`: timestamp (nullable)
  - `created_at`, `updated_at`
- **Comportamento**:
  - Se presente e attivo, **sovrascrive completamente** project + user schedules
  - Consente eccezioni a livello task (es: una task deve essere completata in fine settimana)
  - Se non presente, **eredita** dal project schedule (o user schedule se project schedule assente)
- **Use cases**:
  - Task urgente da completare nel weekend
  - Task di supporto 24/7 (per un project altrimenti 9-17)
  - Task con deadline ad orario specifico

## 3. Tipizzazione del Schedule

Il modello **schedule** rimane **invariato** per mantenere coerenza:

```typescript
interface Schedule {
  id: UUID;
  user_id: UUID; // Proprietario dello schedule
  name: string;
  start_time: string; // "HH:mm" es: "09:00"
  end_time: string;   // "HH:mm" es: "17:00"
  working_days: string[]; // es: ["mon", "tue", "wed", "thu", "fri"]
  timezone?: string;
  is_active: boolean;
  created_at: timestamp;
  updated_at: timestamp;
}

interface ProjectSchedule {
  id: UUID;
  project_id: UUID;
  schedule_id: UUID;
  effective_from: timestamp;
  effective_to?: timestamp;
  created_at: timestamp;
  updated_at: timestamp;
}

interface TaskSchedule {
  id: UUID;
  task_id: UUID;
  schedule_id: UUID;
  effective_from: timestamp;
  effective_to?: timestamp;
  created_at: timestamp;
  updated_at: timestamp;
}
```

## 4. Logica di Risoluzione (Cascading Resolution)

Quando **auto-scheduler** calcola lo schedule effettivo di una task:

```
function getEffectiveSchedule(task) {
  // 1. Prova a trovare task schedule attivo
  if (taskSchedule?.isActive(now)) {
    return schedules.getById(taskSchedule.schedule_id);
  }
  
  // 2. Fallback a project schedule attivo
  const project = projects.getById(task.project_id);
  if (projectSchedule?.isActive(now) && projectSchedule.project_id === task.project_id) {
    return schedules.getById(projectSchedule.schedule_id);
  }
  
  // 3. Fallback a user schedule
  const user = users.getById(task.user_id);
  if (userSchedule?.is_default) {
    return userSchedule;
  }
  
  // 4. Error: nessuno schedule disponibile
  throw new Error("No schedule found for task");
}
```

## 5. Auto-Scheduling e Ricalcolo a Cascata

### 5.1 Trigger di Ricalcolo
L'auto-scheduler **deve riavviarsi e ricalcolare** quando:

1. **User Schedule cambia**
   - Impatto: **Tutte le task dell'utente** che non hanno project/task schedule
   - Scope: globale (tutte le task non ancora programmate)

2. **Project Schedule viene creato/modificato/eliminato**
   - Impatto: **Tutte le task del progetto** che non hanno task schedule esplicito
   - Scope: limitate al progetto interessato

3. **Task Schedule viene creato/modificato/eliminato**
   - Impatto: **Solo quella task specifica**
   - Scope: micro (una sola task)

### 5.2 Logica di Ricerca (Range Query)
Quando si applica auto-scheduling:

```
-- Pseudocode: trovare tutti i slot disponibili
SELECT calendar_event_slots
FROM calendar_events
WHERE user_id = ?
  AND scheduled_start >= task.min_start_date
  AND scheduled_end <= task.max_end_date
  AND day_of_week IN (schedule.working_days)
  AND time >= schedule.start_time
  AND time <= schedule.end_time
ORDER BY scheduled_start ASC
```

## 6. UI/UX Changes

### 6.1 User Settings / Schedule Management
- Pagina esistente: "Settings → My Schedule"
- **Nuovo**: Visualizzare come "Default Schedule" con badge
- **Nuovo**: Indicare quante task/progetti ereditano da questo schedule

### 6.2 Project Edit Dialog
- **Nuovo tab**: "Scheduling"
- **Sezione**: "Project Schedule"
  - Toggle: "Use custom schedule for this project"
  - Se attivo: Dropdown con schedules disponibili + pulsante "Edit"
  - Indicatore: "X task erediteranno questo schedule"
- **Pulsante**: "Auto-reschedule all tasks in this project"

### 6.3 Task Edit Dialog
- **Nuovo campo**: "Schedule Override"
  - Dropdown: "Use project schedule" (default) | "Use custom schedule"
  - Se custom: Selector schedule + date range (effective_from / effective_to)
- **Link rapido**: "Edit schedule"
- **Informazione**: Mostrare quale schedule è in uso attualmente

### 6.4 Calendar View
- **Badge/Icona**: Indicare se task usa custom task schedule
- **Tooltip**: Mostrare quale schedule è applicato (e da quale livello)

## 7. Scenari di Test (TDD)

### Test 1: Risoluzione Schedule Semplice
- ✓ Task senza custom schedule → eredita project schedule
- ✓ Task senza project schedule → eredita user schedule
- ✓ Task con custom schedule → usa task schedule
- ✓ Custom schedule scaduto (effective_to < now) → fallback al livello sottostante

### Test 2: Auto-Scheduling Multi-Livello
- ✓ Task con user schedule solamente → auto-schedule solo con orari user
- ✓ Task con project schedule (overrides user) → auto-schedule con orari progetto
- ✓ Task con task schedule (overrides both) → auto-schedule con orari task specifici
- ✓ Weekend task con schedule 24/7 → non viene ignorato

### Test 3: Trigger di Ricalcolo (Invalidation)
- ✓ Modifica user schedule → ricalcola 10 task non programmate
- ✓ Crea project schedule → ricalcola 5 task del progetto senza task schedule
- ✓ Elimina project schedule → ricalcola task del progetto (indietro a user schedule)
- ✓ Modifica task schedule → ricalcola solo quella task

### Test 4: Cascata Temporal (Effective Date Ranges)
- ✓ Project schedule valido fino al 28/02, oggi è 01/03 → fallback a user schedule
- ✓ Task schedule inizia il 01/03, oggi è 28/02 → usa ancora project schedule
- ✓ Transizione da project a task schedule per effective_to/from → smooth handoff

### Test 5: Conflitti e Edge Cases
- ✓ User schedule non definito, project schedule assente → error
- ✓ Creare task → automaticamente assegnare user schedule se nessuno presente
- ✓ Eliminare schedule usato da X task → cascade soft delete, ricalcola

### Test 6: Performance
- ✓ Ricalcolare 1000 task con nuovo project schedule < 5 sec
- ✓ Query schedules effettive con 100 project schedules + 1000 task schedules < 500ms

## 8. Implementazione Feature-by-Feature (TDD)

### Feature 1: Data Model & Migrations
1. ✗ Test: creare project schedule
   - ✓ Implementa: migration `create_project_schedules` table
   - ✓ Implementa: Prisma schema `ProjectSchedule`
   - ✓ Test passa

2. ✗ Test: creare task schedule
   - ✓ Implementa: migration `create_task_schedules` table
   - ✓ Implementa: Prisma schema `TaskSchedule`
   - ✓ Test passa

### Feature 2: Risoluzione Schedule
1. ✗ Test: `getEffectiveSchedule(task)` con task schedule
   - ✓ Implementa: `scheduleService.getEffectiveSchedule(taskId)`
   - ✓ Test passa

2. ✗ Test: fallback a project schedule
   - ✓ Update: `getEffectiveSchedule()`
   - ✓ Test passa

3. ✗ Test: fallback a user schedule
   - ✓ Update: `getEffectiveSchedule()`
   - ✓ Test passa

### Feature 3: Auto-Scheduler Integration
1. ✗ Test: auto-schedule task usa task schedule
   - ✓ Implementa: `autoScheduleTask()` chiama `getEffectiveSchedule()`
   - ✓ Test passa

2. ✗ Test: auto-schedule task eredita project schedule
   - ✓ Update: `autoScheduleTask()`
   - ✓ Test passa

### Feature 4: Ricalcolo a Cascata
1. ✗ Test: modifica user schedule → ricalcola task
   - ✓ Implementa: `onUserScheduleChanged(userId)` job
   - ✓ Update: `userSettingsService`
   - ✓ Test passa

2. ✗ Test: modifica project schedule → ricalcola solo project task
   - ✓ Implementa: `onProjectScheduleChanged(projectId)` job
   - ✓ Crea endpoint: `PATCH /projects/:id/schedule`
   - ✓ Test passa

3. ✗ Test: modifica task schedule → ricalcola task
   - ✓ Implementa: `onTaskScheduleChanged(taskId)` job
   - ✓ Crea endpoint: `PATCH /tasks/:id/schedule`
   - ✓ Test passa

### Feature 5: API Routes
1. ✗ Test: GET `/projects/:id/schedule` → ritorna project schedule (o null)
   - ✓ Implementa: route
   - ✓ Test passa

2. ✗ Test: POST `/projects/:id/schedule` → crea project schedule
   - ✓ Implementa: route + validation
   - ✓ Test passa

3. ✗ Test: PATCH `/projects/:id/schedule` → modifica + ricalcola
   - ✓ Implementa: route + trigger ricalcolo
   - ✓ Test passa

4. ✗ Test: DELETE `/projects/:id/schedule` → elimina + ricalcola
   - ✓ Implementa: route + cascade invalidation
   - ✓ Test passa

5. ✗ Test: GET/POST/PATCH/DELETE `/tasks/:id/schedule` (stesso pattern)
   - ✓ Implementa: 4 route

### Feature 6: Frontend UI
1. ✗ Test: Project edit dialog mostra "Schedule" tab
   - ✓ Implementa: UI in `ProjectEditDialog`
   - ✓ Test passa

2. ✗ Test: Quando abilito custom project schedule → dropdown schedule si popola
   - ✓ Implementa: API call to GET `/schedules` (filter by user only)
   - ✓ Test passa

3. ✗ Test: Task edit dialog mostra "Schedule Override" field
   - ✓ Implementa: UI in `TaskEditDialog`
   - ✓ Test passa

4. ✗ Test: Salvare project schedule → API POST + ricalcolo visibile
   - ✓ Implementa: submit logic
   - ✓ Test passa

### Feature 7: Data Migration & Backfill
1. ✗ Test: Eseguire migration su DB con 1000 task → nessuno assegnato a project/task schedule (tutti credono user schedule)
   - ✓ Implementa: migration che preserva status quo (no project/task schedules creati)
   - ✓ Esecuzione su staging
   - ✓ Verifica: `getEffectiveSchedule()` ritorna user schedule per tutti

2. ✗ Test: (Opzionale) Importare project schedule da config file
   - ✓ Implementa: seed script per popolare progettivamente

## 9. Roadmap di Implementazione

**Phase 1 (Week 1): Data Model**
- [ ] Crea migration: `create_project_schedules`
- [ ] Crea migration: `create_task_schedules`
- [ ] Update Prisma schema
- [ ] Run migration su local + staging
- [ ] Tests per data model

**Phase 2 (Week 2): Schedule Resolution**
- [ ] Implementa `scheduleService.getEffectiveSchedule(taskId)`
- [ ] Unit tests
- [ ] Integration test con auto-scheduler

**Phase 3 (Week 3): Ricalcolo a Cascata**
- [ ] Implementa job/trigger per ricalcolo
- [ ] Tests per ciascun trigger

**Phase 4 (Week 4): API Routes**
- [ ] Implementa 8 endpoint
- [ ] Route tests

**Phase 5 (Week 5): Frontend**
- [ ] Project edit UI
- [ ] Task edit UI
- [ ] E2E tests

**Phase 6 (Week 6): Polish & Docs**
- [ ] Performance tuning
- [ ] Documentation
- [ ] Staging → Production rollout

## 10. Considerazioni di Sicurezza e Performance

### Autorizzazione
- User può leggere/scrivere project schedule solo se membro/manager del progetto
- User può leggere/scrivere task schedule solo se assegnatario/creatore della task
- Admin può sovrascrivere tutto

### Caching
- Cache `getEffectiveSchedule()` con TTL 5min (data è spike point)
- Invalidate cache quando schedule cambia
- Usa Redis per caching distribuito

### Indexes
- `project_schedules(project_id, effective_from, effective_to)`
- `task_schedules(task_id, effective_from, effective_to)`
- `schedules(user_id)`

## 11. Fallback e Default Behavior

Se in qualunque momento **nessuno** dei 3 livelli di schedule è disponibile/attivo:
- Log warning: "Task X ha no active schedule"
- Comportamento: **rifiutare** l'auto-scheduling (non fare asserzioni random)
- Richiedere: user definisca un default schedule globale prima di usare feature 