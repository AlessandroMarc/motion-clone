import { createBrowserClient } from '@supabase/ssr';
import { validateEnvOrThrow } from './validateEnv';

// Validate environment variables on module load
// In CI: only warns, doesn't fail
// In production (Vercel): fails if missing
validateEnvOrThrow();

// Get environment variables
// In CI/build without env vars, use placeholders (won't be used anyway)
// In production, these will be the real values
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
