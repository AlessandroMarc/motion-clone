-- Migration: add is_day_block to calendar_events
--
-- How to apply:
--   Option A (Supabase CLI):
--     supabase db push  (from repo root, if using supabase migrations)
--   Option B (manual via Supabase dashboard):
--     Paste this file into the SQL editor at supabase.com → project → SQL Editor
--   Option C (psql):
--     psql "$DATABASE_URL" -f backend/migrations/add_is_day_block_to_calendar_events.sql
--
-- Safe to re-run (IF NOT EXISTS guard).

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS is_day_block BOOLEAN NOT NULL DEFAULT false;
