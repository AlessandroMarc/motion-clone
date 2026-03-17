-- Migration: Add is_reminder column to tasks table
-- Run this in your Supabase SQL editor

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_reminder BOOLEAN NOT NULL DEFAULT FALSE;
