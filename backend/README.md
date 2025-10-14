# Motion Clone Backend API

A RESTful API built with Express.js and Supabase for managing tasks, projects, milestones, and calendar events.

## Setup

### 1. Environment Variables

Create a `.env.development.local` file in the backend directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_SUPABASES_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_URL=your_supabase_url_here
```

### 2. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase-schema.sql` to create all required tables

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The server will run on `http://localhost:3003`

## API Endpoints

### Tasks

- `GET /api/tasks` - Get all tasks (supports query params: `project_id`, `status`)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Projects

- `GET /api/projects` - Get all projects (supports query param: `status`)
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Milestones

- `GET /api/milestones` - Get all milestones (supports query params: `project_id`, `status`)
- `GET /api/milestones/:id` - Get milestone by ID
- `POST /api/milestones` - Create new milestone
- `PUT /api/milestones/:id` - Update milestone
- `DELETE /api/milestones/:id` - Delete milestone

### Calendar Events

- `GET /api/calendar-events` - Get all calendar events (supports query params: `start_date`, `end_date`, `task_id`, `project_id`)
- `GET /api/calendar-events/:id` - Get calendar event by ID
- `POST /api/calendar-events` - Create new calendar event
- `PUT /api/calendar-events/:id` - Update calendar event
- `DELETE /api/calendar-events/:id` - Delete calendar event

## Data Types

### Task

```typescript
{
  id: string;
  title: string;
  description?: string;
  due_date: Date | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dependencies: string[];
  project_id?: string;
  created_at: string;
  updated_at: string;
}
```

### Project

```typescript
{
  id: string;
  name: string;
  description?: string;
  deadline: Date | null;
  status: 'not-started' | 'in-progress' | 'completed';
  created_at: string;
  updated_at: string;
}
```

### Milestone

```typescript
{
  id: string;
  title: string;
  description?: string;
  due_date: Date | null;
  status: 'not-started' | 'in-progress' | 'completed';
  project_id: string;
  created_at: string;
  updated_at: string;
}
```

### Calendar Event

```typescript
{
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  linked_task_id?: string;
  linked_project_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

## Example Usage

### Create a Project

```bash
curl -X POST http://localhost:3003/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "description": "A sample project",
    "deadline": "2024-12-31T23:59:59Z"
  }'
```

### Create a Task

```bash
curl -X POST http://localhost:3003/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete API setup",
    "description": "Set up the backend API",
    "priority": "high",
    "project_id": "project-uuid-here"
  }'
```

### Get Tasks by Project

```bash
curl "http://localhost:3003/api/tasks?project_id=project-uuid-here"
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `204` - No Content (for successful deletions)
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

Error responses include a JSON object with an `error` field containing the error message.
