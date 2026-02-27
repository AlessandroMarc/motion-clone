-- Migration: create_task_schedules
-- Creates the task_schedules table for task-level schedule overrides

CREATE TABLE IF NOT EXISTS task_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient cascading resolution queries
CREATE INDEX IF NOT EXISTS idx_task_schedules_task_id
  ON task_schedules(task_id, effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_task_schedules_schedule_id
  ON task_schedules(schedule_id);

-- RLS policies
ALTER TABLE task_schedules ENABLE ROW LEVEL SECURITY;

-- Users can view task schedules for their own tasks
CREATE POLICY "Users can view their own task schedules"
  ON task_schedules FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );

-- Users can insert task schedules for their own tasks
CREATE POLICY "Users can insert their own task schedules"
  ON task_schedules FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );

-- Users can update task schedules for their own tasks
CREATE POLICY "Users can update their own task schedules"
  ON task_schedules FOR UPDATE
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );

-- Users can delete task schedules for their own tasks
CREATE POLICY "Users can delete their own task schedules"
  ON task_schedules FOR DELETE
  USING (
    task_id IN (
      SELECT id FROM tasks WHERE user_id = auth.uid()
    )
  );
