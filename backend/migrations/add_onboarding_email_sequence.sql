-- Migration: Add onboarding email sequence tracking table
-- Tracks the 3-email onboarding sequence sent to new users after registration

CREATE TABLE IF NOT EXISTS onboarding_email_sequence (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  email_number INTEGER NOT NULL CHECK (email_number IN (1, 2, 3)),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email_number)
);

-- Index for efficient lookup of emails due to be sent
CREATE INDEX IF NOT EXISTS idx_onboarding_email_sequence_pending
  ON onboarding_email_sequence(status, scheduled_for)
  WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE onboarding_email_sequence ENABLE ROW LEVEL SECURITY;

-- Service role can read/write all rows (used by the backend cron job)
CREATE POLICY "Service role full access to onboarding_email_sequence"
  ON onboarding_email_sequence
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can only see their own rows
CREATE POLICY "Users can view own onboarding email sequence"
  ON onboarding_email_sequence
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
