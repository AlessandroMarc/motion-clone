-- ============================================================
-- ROLLBACK Migration: Remove Tags Feature
-- Created: 2026-01-20
-- Description: Reverses the add_tags_to_tasks.sql migration
-- ============================================================
-- 
-- ⚠️  WARNING: This will permanently delete all tag data!
-- Only run this if you need to undo the tags feature.
--
-- IMPORTANT: Always run rollbacks in REVERSE order of creation.
-- We created: tags -> task_tags -> indexes -> policies
-- We drop:    policies -> indexes -> task_tags -> tags
-- ============================================================

-- ============================================================
-- STEP 1: Drop RLS Policies (must drop before tables)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own task_tags" ON task_tags;
DROP POLICY IF EXISTS "Users can insert own task_tags" ON task_tags;
DROP POLICY IF EXISTS "Users can delete own task_tags" ON task_tags;

DROP POLICY IF EXISTS "Users can view own tags" ON tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON tags;
DROP POLICY IF EXISTS "Users can update own tags" ON tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON tags;

-- ============================================================
-- STEP 2: Drop indexes (optional - tables drop will remove them)
-- ============================================================
DROP INDEX IF EXISTS idx_tags_user_id;
DROP INDEX IF EXISTS idx_tags_name;
DROP INDEX IF EXISTS idx_task_tags_task_id;
DROP INDEX IF EXISTS idx_task_tags_tag_id;

-- ============================================================
-- STEP 3: Drop trigger
-- ============================================================
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;

-- ============================================================
-- STEP 4: Drop tables (junction table first due to foreign keys!)
-- ============================================================
DROP TABLE IF EXISTS task_tags;
DROP TABLE IF EXISTS tags;

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Confirm tables are gone:
-- SELECT * FROM information_schema.tables WHERE table_name IN ('tags', 'task_tags');
-- Should return 0 rows
