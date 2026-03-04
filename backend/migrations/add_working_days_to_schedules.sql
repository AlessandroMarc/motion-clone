-- Migration: Add working_days JSONB column to schedules table
-- This allows defining per-day working hours (e.g. Mon–Fri 9–18, not working on weekends).
-- The column is nullable; when NULL the existing working_hours_start/end apply to all days.
-- Format: { "1": {"start": 9, "end": 18}, "2": {"start": 9, "end": 18}, ..., "6": null }
-- Keys are day-of-week numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
-- A null value for a key means that day is not a working day.

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT NULL;

-- Add CHECK constraint to validate working_days structure:
-- - Keys must be valid day-of-week numbers (0-6)
-- - Values must be null or objects with numeric start/end fields
-- - Range constraints: 0 <= start < end <= 24
ALTER TABLE schedules ADD CONSTRAINT working_days_valid CHECK (
  working_days IS NULL OR (
    jsonb_typeof(working_days) = 'object' AND
    (
      SELECT bool_and(
        (key::int >= 0 AND key::int <= 6) AND
        (
          value IS NULL OR (
            jsonb_typeof(value) = 'object' AND
            (value->>'start')::int IS NOT NULL AND
            (value->>'end')::int IS NOT NULL AND
            (value->>'start')::int >= 0 AND
            (value->>'end')::int <= 24 AND
            (value->>'start')::int < (value->>'end')::int
          )
        )
      )
      FROM jsonb_each(working_days)
    )
  )
);
