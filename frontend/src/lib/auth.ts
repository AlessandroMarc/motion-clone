import { supabase } from './supabase';

// In-memory cache of the current access token.
// Populated on first read, then kept in sync via onAuthStateChange so we avoid
// paying the ~50-100ms cost of supabase.auth.getSession() on every API call.
let cachedToken: string | null = null;
let cachedExpiresAt: number | null = null; // epoch seconds
let initialized = false;
let pendingInit: Promise<void> | null = null;

// Refresh slightly before expiry so we never hand out an about-to-expire token.
const EXPIRY_SAFETY_MARGIN_SECONDS = 30;

function updateCacheFromSession(session: {
  access_token?: string | null;
  expires_at?: number | null;
} | null): void {
  cachedToken = session?.access_token ?? null;
  cachedExpiresAt = session?.expires_at ?? null;
}

function isTokenStillValid(): boolean {
  if (!cachedToken) return false;
  if (!cachedExpiresAt) return true; // no expiry info; trust it
  const nowSeconds = Math.floor(Date.now() / 1000);
  return cachedExpiresAt - EXPIRY_SAFETY_MARGIN_SECONDS > nowSeconds;
}

async function initialize(): Promise<void> {
  if (initialized) return;
  if (pendingInit) return pendingInit;

  pendingInit = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    updateCacheFromSession(session);

    supabase.auth.onAuthStateChange((_event, session) => {
      updateCacheFromSession(session);
    });

    initialized = true;
  })();

  return pendingInit;
}

export async function getAuthToken(): Promise<string | null> {
  // Fast path: initialized and token is still fresh.
  if (initialized && isTokenStillValid()) {
    return cachedToken;
  }

  // First call, or cached token is expiring — (re)fetch the session.
  await initialize();
  if (!isTokenStillValid()) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    updateCacheFromSession(session);
  }

  return cachedToken;
}
