import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './loadEnv.js';

loadEnv();

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:');
  console.error('Required: SUPABASE_URL and SUPABASE_ANON_KEY');
  console.error(
    'Available env vars:',
    Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  );
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Default client for unauthenticated operations
export const supabase = createClient(supabaseUrl, supabaseKey);

// Create authenticated Supabase client with user's JWT token
export function getAuthenticatedSupabase(authToken: string) {
  if (!authToken) {
    throw new Error('Auth token is required');
  }
  return createClient(supabaseUrl!, supabaseKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  });
}
