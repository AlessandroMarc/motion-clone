-- Migration: Add onboarding tracking fields to user_settings table
-- This migration adds fields to track user onboarding progress

-- First, check if user_settings table exists, if not create it
-- (Based on the code, it seems user_settings should already exist, but we'll handle it)

-- Add onboarding fields to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50),
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries on onboarding status
CREATE INDEX IF NOT EXISTS idx_user_settings_onboarding_completed 
ON user_settings(onboarding_completed) 
WHERE onboarding_completed = false;

-- Add comment to document the onboarding_step values
COMMENT ON COLUMN user_settings.onboarding_step IS 'Current onboarding step: task_created, project_created, scheduled, calendar_synced, or null if not started';
