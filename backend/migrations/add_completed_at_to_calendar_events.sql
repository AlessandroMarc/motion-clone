-- Migration: Add completed_at column to calendar_events table
-- Run this SQL in your Supabase SQL editor if you have an existing database

-- Add completed_at column to calendar_events table
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add a comment to document the column purpose
COMMENT ON COLUMN calendar_events.completed_at IS 'Timestamp when the calendar event was completed. Only used when linked_task_id is not null.';

