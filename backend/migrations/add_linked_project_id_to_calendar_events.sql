-- Migration: Add linked_project_id column to calendar_events table
-- This column is required by the delete_project_and_tasks stored procedure
-- and was defined in supabase-schema.sql but not previously added via migration.

-- ─── 1. Add linked_project_id column (idempotent) ─────────────────────────────
ALTER TABLE calendar_events
    ADD COLUMN IF NOT EXISTS linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- ─── 2. Create index (idempotent) ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_calendar_events_linked_project_id
    ON calendar_events(linked_project_id);

-- ─── 3. Re-create the atomic delete procedure so it runs cleanly ──────────────
CREATE OR REPLACE FUNCTION delete_project_and_tasks(p_project_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
BEGIN
  BEGIN
    -- Delete all tasks related to this project
    DELETE FROM tasks WHERE project_id = p_project_id;

    -- Delete all milestones related to this project
    DELETE FROM milestones WHERE project_id = p_project_id;

    -- Delete all calendar events linked to this project
    DELETE FROM calendar_events WHERE linked_project_id = p_project_id;

    -- Delete the project itself
    DELETE FROM projects WHERE id = p_project_id;

    RETURN QUERY SELECT TRUE::BOOLEAN, 'Project and all related data deleted successfully'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, ('Failed to delete project: ' || SQLERRM)::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_project_and_tasks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_project_and_tasks(UUID) TO service_role;
