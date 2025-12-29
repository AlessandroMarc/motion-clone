-- Migration: Add Google Calendar OAuth integration
-- Run this SQL in your Supabase SQL editor to add Google Calendar integration support

-- Create google_calendar_tokens table
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    calendar_id TEXT NOT NULL DEFAULT 'primary',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add columns to calendar_events table
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS synced_from_google BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_synced_from_google ON calendar_events(synced_from_google);

-- Create unique constraint on google_event_id per user (an event can only be synced once per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_user_google_event_id 
ON calendar_events(user_id, google_event_id) 
WHERE google_event_id IS NOT NULL;

-- Create trigger for updated_at on google_calendar_tokens
CREATE TRIGGER update_google_calendar_tokens_updated_at 
BEFORE UPDATE ON google_calendar_tokens
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies for google_calendar_tokens
CREATE POLICY "Users can view own google calendar tokens" 
ON google_calendar_tokens FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own google calendar tokens" 
ON google_calendar_tokens FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own google calendar tokens" 
ON google_calendar_tokens FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own google calendar tokens" 
ON google_calendar_tokens FOR DELETE 
USING (auth.uid() = user_id);





