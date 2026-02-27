-- Migration: create_project_schedules
-- Creates the project_schedules table for project-level schedule overrides

CREATE TABLE IF NOT EXISTS project_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient cascading resolution queries
CREATE INDEX IF NOT EXISTS idx_project_schedules_project_id
  ON project_schedules(project_id, effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_project_schedules_schedule_id
  ON project_schedules(schedule_id);

-- RLS policies
ALTER TABLE project_schedules ENABLE ROW LEVEL SECURITY;

-- Users can view project schedules for their own projects
CREATE POLICY "Users can view their own project schedules"
  ON project_schedules FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert project schedules for their own projects
CREATE POLICY "Users can insert their own project schedules"
  ON project_schedules FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can update project schedules for their own projects
CREATE POLICY "Users can update their own project schedules"
  ON project_schedules FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can delete project schedules for their own projects
CREATE POLICY "Users can delete their own project schedules"
  ON project_schedules FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
