import { createClient } from '@supabase/supabase-js';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { loadEnv } from './loadEnv.js';

loadEnv();

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// Default client for unauthenticated operations (subject to RLS)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Service role client for administrative operations (bypasses RLS)
export const serviceRoleSupabase = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase; // Fallback to anon key if service key is missing (will be subject to RLS)

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

/**
 * Get Supabase JWT secret from environment variables
 * This is used for local JWT verification
 */
export function getSupabaseJwtSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'SUPABASE_JWT_SECRET is required for local JWT verification. ' +
        'Find it in your Supabase dashboard under Settings > API > JWT Secret'
    );
  }
  return secret;
}

/**
 * Interface for verified JWT payload
 */
export interface VerifiedTokenPayload {
  userId: string;
  email?: string;
  exp: number;
}

/**
 * Verify JWT token locally without making a remote API call
 * This provides significant performance improvement over supabase.auth.getUser()
 *
 * @param token - The JWT token to verify
 * @returns Verified token payload with userId and expiration
 * @throws Error if token is invalid, expired, or malformed
 */
export function verifyAuthToken(token: string): VerifiedTokenPayload {
  if (!token) {
    throw new Error('Token is required');
  }

  try {
    const secret = getSupabaseJwtSecret();

    // Verify and decode the JWT
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'], // Supabase uses HS256
    }) as JwtPayload;

    // Extract user ID from the 'sub' claim (standard JWT claim for user identifier)
    const userId = decoded.sub;
    if (!userId) {
      throw new Error('Token does not contain user ID (sub claim)');
    }

    // Check if token is expired (jwt.verify already checks this, but we extract for reference)
    const exp = decoded.exp;
    if (!exp) {
      throw new Error('Token does not contain expiration (exp claim)');
    }

    return {
      userId,
      email: decoded.email,
      exp,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error(`Invalid token: ${error.message}`);
    } else if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to verify token');
    }
  }
}
