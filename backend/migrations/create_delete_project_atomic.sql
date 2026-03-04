-- Create atomic delete function for projects
-- This function deletes a project and all its related data in a single transaction
-- with automatic rollback on any error

CREATE OR REPLACE FUNCTION delete_project_and_tasks(p_project_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
BEGIN
  -- Start transaction
  BEGIN
    -- Delete all tasks related to this project
    DELETE FROM tasks WHERE project_id = p_project_id;
    
    -- Delete all milestones related to this project
    DELETE FROM milestones WHERE project_id = p_project_id;
    
    -- Delete all calendar events linked to this project
    DELETE FROM calendar_events WHERE linked_project_id = p_project_id;
    
    -- Delete the project itself
    DELETE FROM projects WHERE id = p_project_id;
    
    -- Return success
    RETURN QUERY SELECT TRUE::BOOLEAN, 'Project and all related data deleted successfully'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    -- Automatic rollback happens, return error
    RETURN QUERY SELECT FALSE::BOOLEAN, ('Failed to delete project: ' || SQLERRM)::TEXT;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_project_and_tasks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_project_and_tasks(UUID) TO service_role;
