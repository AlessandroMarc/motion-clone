-- Add recurrence_start_date to tasks: lets users set the anchor date for
-- day-of-week / day-of-month recurrence patterns.
-- Idempotent: safe to run multiple times.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_start_date DATE;

-- Index for efficient lookups of recurring tasks by start date
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_start_date
  ON tasks(user_id, is_recurring, recurrence_start_date)
  WHERE is_recurring = true;
