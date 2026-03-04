-- Migration: Add working_days JSONB column to schedules table
-- This allows defining per-day working hours (e.g. Mon–Fri 9–18, not working on weekends).
-- The column is nullable; when NULL the existing working_hours_start/end apply to all days.
-- Format: { "1": {"start": 9, "end": 18}, "2": {"start": 9, "end": 18}, ..., "6": null }
-- Keys are day-of-week numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
-- A null value for a key means that day is not a working day.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT NULL;
