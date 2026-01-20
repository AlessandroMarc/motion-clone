-- ============================================================
-- Migration: Add Tags Feature to Tasks
-- Created: 2026-01-20
-- Description: Adds tagging functionality to tasks
-- ============================================================

-- ============================================================
-- STEP 1: Create the tags table
-- ============================================================
-- This stores the available tags for each user
CREATE TABLE IF NOT EXISTS tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',  -- Hex color code
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Each user can only have one tag with a given name
    UNIQUE(user_id, name)
);

-- ============================================================
-- STEP 2: Create the junction table (many-to-many relationship)
-- ============================================================
-- A task can have multiple tags, and a tag can be on multiple tasks
CREATE TABLE IF NOT EXISTS task_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate tag assignments to the same task
    UNIQUE(task_id, tag_id)
);

-- ============================================================
-- STEP 3: Add indexes for query performance
-- ============================================================
-- Why? Indexes speed up lookups. Without them, PostgreSQL would 
-- scan every row (slow!). With them, it uses a B-tree (fast!).

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- ============================================================
-- STEP 4: Add trigger to auto-update updated_at
-- ============================================================
-- This reuses the existing trigger function from your schema
CREATE TRIGGER update_tags_updated_at 
    BEFORE UPDATE ON tags
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 5: Enable Row Level Security (RLS)
-- ============================================================
-- RLS ensures users can only see/modify their own data

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: Create RLS Policies for tags table
-- ============================================================
CREATE POLICY "Users can view own tags" 
    ON tags FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" 
    ON tags FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" 
    ON tags FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" 
    ON tags FOR DELETE 
    USING (auth.uid() = user_id);

-- ============================================================
-- STEP 7: Create RLS Policies for task_tags junction table
-- ============================================================
-- This is trickier! We need to check that the user owns BOTH 
-- the task AND the tag they're trying to link.

CREATE POLICY "Users can view own task_tags" 
    ON task_tags FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_tags.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own task_tags" 
    ON task_tags FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_tags.task_id 
            AND tasks.user_id = auth.uid()
        )
        AND
        EXISTS (
            SELECT 1 FROM tags 
            WHERE tags.id = task_tags.tag_id 
            AND tags.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own task_tags" 
    ON task_tags FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM tasks 
            WHERE tasks.id = task_tags.task_id 
            AND tasks.user_id = auth.uid()
        )
    );

-- ============================================================
-- VERIFICATION QUERIES (optional - comment these out in production)
-- ============================================================
-- After running the migration, you can verify it worked:
-- SELECT * FROM information_schema.tables WHERE table_name IN ('tags', 'task_tags');
-- SELECT * FROM information_schema.columns WHERE table_name = 'tags';
