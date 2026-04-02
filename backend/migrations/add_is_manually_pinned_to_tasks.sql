-- Migration: add is_manually_pinned to tasks
-- When true, the auto-scheduler will not move or delete this task's calendar events.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_manually_pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tasks_is_manually_pinned ON tasks(is_manually_pinned)
  WHERE is_manually_pinned = true;
