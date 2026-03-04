-- Add start_date to tasks: lets users set the earliest date a task can be scheduled.
-- Tasks will not be scheduled before this date.
-- Non-invasive: column is nullable with no default, so existing rows are unaffected.
-- Idempotent: safe to run multiple times.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;

-- Index for efficient lookups when filtering by start date during scheduling
CREATE INDEX IF NOT EXISTS idx_tasks_start_date
  ON tasks(user_id, start_date)
  WHERE start_date IS NOT NULL;
