-- Migration: Formalise schedules table, add schedule_id FK to tasks, backfill existing tasks
-- Run this SQL in your Supabase SQL editor

-- ─── 1. Create schedules table (idempotent) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Default',
    working_hours_start INTEGER NOT NULL DEFAULT 9 CHECK (working_hours_start BETWEEN 0 AND 23),
    working_hours_end INTEGER NOT NULL DEFAULT 22 CHECK (working_hours_end BETWEEN 0 AND 23),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_is_default ON schedules(is_default);

-- RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can insert own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can update own schedules" ON schedules;
DROP POLICY IF EXISTS "Users can delete own schedules" ON schedules;

CREATE POLICY "Users can view own schedules" ON schedules
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedules" ON schedules
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedules" ON schedules
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedules" ON schedules
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_schedules_updated_at ON schedules;
CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 2. Backfill active_schedule_id in user_settings with valid schedule IDs ──
-- For any user_settings with an invalid active_schedule_id, assign their default schedule.
UPDATE user_settings us
SET active_schedule_id = (
    SELECT s.id FROM schedules s
    WHERE s.user_id = us.user_id
      AND s.is_default = true
    LIMIT 1
)
WHERE active_schedule_id IS NOT NULL
  AND active_schedule_id NOT IN (SELECT id FROM schedules);

-- For any remaining invalid references, fall back to their first schedule.
UPDATE user_settings us
SET active_schedule_id = (
    SELECT s.id FROM schedules s
    WHERE s.user_id = us.user_id
    ORDER BY s.created_at ASC
    LIMIT 1
)
WHERE active_schedule_id IS NOT NULL
  AND active_schedule_id NOT IN (SELECT id FROM schedules);

-- ─── 2b. Add FK from user_settings.active_schedule_id → schedules.id ────────────
-- If the constraint doesn't already exist, add it (SET NULL on delete so losing
-- a schedule doesn't destroy the settings row).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_user_settings_active_schedule'
          AND table_name = 'user_settings'
    ) THEN
        ALTER TABLE user_settings
            ADD CONSTRAINT fk_user_settings_active_schedule
            FOREIGN KEY (active_schedule_id) REFERENCES schedules(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ─── 3. Add schedule_id column to tasks (nullable initially for backfill) ──────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS schedule_id UUID;

-- ─── 4. Backfill: assign every task the owner's default schedule ────────────────
-- 4a. Ensure every user who has tasks also has at least one default schedule.
INSERT INTO schedules (user_id, name, working_hours_start, working_hours_end, is_default)
SELECT DISTINCT t.user_id, 'Default', 9, 22, true
FROM tasks t
WHERE NOT EXISTS (
    SELECT 1 FROM schedules s WHERE s.user_id = t.user_id
)
ON CONFLICT DO NOTHING;

-- 4b. Set schedule_id on tasks that don't have one yet.
UPDATE tasks
SET schedule_id = (
    SELECT s.id FROM schedules s
    WHERE s.user_id = tasks.user_id
      AND s.is_default = true
    LIMIT 1
)
WHERE schedule_id IS NULL;

-- For users without a default-flagged schedule, fall back to their first schedule.
UPDATE tasks
SET schedule_id = (
    SELECT s.id FROM schedules s
    WHERE s.user_id = tasks.user_id
    ORDER BY s.created_at ASC
    LIMIT 1
)
WHERE schedule_id IS NULL;

-- ─── 5. Make schedule_id NOT NULL + add FK ──────────────────────────────────────
ALTER TABLE tasks ALTER COLUMN schedule_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_tasks_schedule'
          AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks
            ADD CONSTRAINT fk_tasks_schedule
            FOREIGN KEY (schedule_id) REFERENCES schedules(id);
    END IF;
END $$;

-- Index for FK lookups
CREATE INDEX IF NOT EXISTS idx_tasks_schedule_id ON tasks(schedule_id);
