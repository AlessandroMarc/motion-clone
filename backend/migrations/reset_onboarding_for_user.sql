-- Script per resettare l'onboarding per un utente specifico (utile per test)
-- Sostituisci 'USER_ID_HERE' con l'ID dell'utente che vuoi resettare

-- Reset onboarding per un utente specifico
UPDATE user_settings
SET 
  onboarding_completed = false,
  onboarding_step = NULL,
  onboarding_started_at = NULL,
  onboarding_completed_at = NULL
WHERE user_id = 'USER_ID_HERE';

-- Se l'utente non ha ancora user_settings, crea un record di default
INSERT INTO user_settings (user_id, onboarding_completed, onboarding_step)
VALUES ('USER_ID_HERE', false, NULL)
ON CONFLICT (user_id) DO UPDATE SET
  onboarding_completed = false,
  onboarding_step = NULL,
  onboarding_started_at = NULL,
  onboarding_completed_at = NULL;
