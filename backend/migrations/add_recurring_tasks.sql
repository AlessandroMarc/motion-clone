-- Recurring tasks feature: add columns to track recurrence patterns and generation progress
-- Idempotent: safe to run multiple times

-- Add recurrence columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(10) CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1 CHECK (recurrence_interval > 0);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_generation_cutoff TIMESTAMP;

-- Add constraint: recurrence_pattern and recurrence_interval are required iff is_recurring = true
ALTER TABLE tasks ADD CONSTRAINT chk_recurrence_fields_required
  CHECK (
    (is_recurring = false AND recurrence_pattern IS NULL AND recurrence_interval = 1) OR
    (is_recurring = true AND recurrence_pattern IS NOT NULL AND recurrence_interval > 0)
  );

-- Index for efficient recurring task queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_user_id ON tasks(user_id, is_recurring);
