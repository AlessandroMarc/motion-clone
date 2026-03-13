-- Migration: Add optional schedule_id to projects

-- 1. Add column (nullable) to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS schedule_id UUID;

-- 2. Add foreign key constraint to schedules (optional schedule)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_projects_schedule'
          AND table_name = 'projects'
    ) THEN
        ALTER TABLE projects
            ADD CONSTRAINT fk_projects_schedule
            FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL;
    END IF;
END $$;
