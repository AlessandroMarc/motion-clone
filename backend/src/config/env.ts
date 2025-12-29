type NonEmptyString = string & { __brand: 'NonEmptyString' };

function isNonEmptyString(value: unknown): value is NonEmptyString {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireEnv(name: string): NonEmptyString {
  const value = process.env[name];
  if (!isNonEmptyString(value)) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim() as NonEmptyString;
}

function requireHttpUrlEnv(name: string): string {
  const raw = requireEnv(name);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `Invalid URL in environment variable ${name}: "${raw}". Expected a full URL like "https://example.com".`
    );
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `Invalid URL protocol for ${name}: "${url.protocol}". Expected http or https.`
    );
  }

  return url.toString();
}

export type GoogleOAuthEnv = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

let cachedGoogleOAuthEnv: GoogleOAuthEnv | null = null;

/**
 * Required when using Google Calendar integration.
 * NOTE: No defaults. Missing/invalid values throw with a clear error.
 */
export function getGoogleOAuthEnv(): GoogleOAuthEnv {
  if (cachedGoogleOAuthEnv) return cachedGoogleOAuthEnv;

  cachedGoogleOAuthEnv = {
    clientId: requireEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri: requireHttpUrlEnv('GOOGLE_REDIRECT_URI'),
  };

  return cachedGoogleOAuthEnv;
}

let cachedFrontendUrl: string | null = null;

/**
 * Required for Google Calendar OAuth callback redirect back to the UI.
 * Example: https://motion-clone.yourdomain.com
 */
export function getFrontendUrl(): string {
  if (cachedFrontendUrl) return cachedFrontendUrl;
  cachedFrontendUrl = requireHttpUrlEnv('FRONTEND_URL');
  return cachedFrontendUrl;
}






