-- Migration: add schedules, user_settings tables and update tasks table
-- Applies to existing databases. Safe to re-run (idempotent guards included).

-- ── schedules ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Default',
    working_hours_start INTEGER NOT NULL DEFAULT 9
        CHECK (working_hours_start BETWEEN 0 AND 23),
    working_hours_end INTEGER NOT NULL DEFAULT 22
        CHECK (working_hours_end BETWEEN 0 AND 23),
    -- Ensure start and end differ so empty windows are rejected at the DB level.
    -- NOTE: overnight schedules (e.g. 22-06) are not supported; use a second
    --       schedule or extend this constraint if overnight support is needed.
    CONSTRAINT schedules_hours_differ CHECK (working_hours_start != working_hours_end),
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
-- Intentionally narrow: helps filter the active/default schedule per user.
CREATE INDEX IF NOT EXISTS idx_schedules_is_default ON schedules(is_default);

-- Only one schedule per user may be the default at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_one_default_per_user
    ON schedules(user_id)
    WHERE is_default = true;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_schedules_updated_at'
    ) THEN
        CREATE TRIGGER update_schedules_updated_at
            BEFORE UPDATE ON schedules
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- RLS policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedules' AND policyname = 'Users can view own schedules') THEN
        CREATE POLICY "Users can view own schedules" ON schedules FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedules' AND policyname = 'Users can insert own schedules') THEN
        CREATE POLICY "Users can insert own schedules" ON schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedules' AND policyname = 'Users can update own schedules') THEN
        CREATE POLICY "Users can update own schedules" ON schedules FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedules' AND policyname = 'Users can delete own schedules') THEN
        CREATE POLICY "Users can delete own schedules" ON schedules FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ── user_settings ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    active_schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    onboarding_step VARCHAR(50),
    onboarding_started_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- No separate index needed: UNIQUE(user_id) creates one implicitly.

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_settings_updated_at'
    ) THEN
        CREATE TRIGGER update_user_settings_updated_at
            BEFORE UPDATE ON user_settings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- RLS policies (no DELETE — user_settings rows should never be deleted;
-- deleting them would break the application on next load)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can view own settings') THEN
        CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can insert own settings') THEN
        CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_settings' AND policyname = 'Users can update own settings') THEN
        CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ── tasks table: add missing columns ─────────────────────────────────────────

ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS blocked_by UUID[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS planned_duration_minutes INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER NOT NULL DEFAULT 0;

-- Fix status CHECK constraint: 'pending' → 'not-started' to match WorkItemStatus.
-- Drop old constraint if it exists (name used in original schema), then add new one.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
    CHECK (status IN ('not-started', 'in-progress', 'completed'));

-- Migrate any rows still using the old 'pending' value
UPDATE tasks SET status = 'not-started' WHERE status = 'pending';
