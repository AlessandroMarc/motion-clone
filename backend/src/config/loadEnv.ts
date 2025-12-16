import dotenv from 'dotenv';
import path from 'path';

let loaded = false;

/**
 * Load .env once. In local dev we support running from either:
 * - repoRoot/backend (so ../.env is repoRoot/.env)
 * - repoRoot (so ./.env is repoRoot/.env)
 *
 * In production (e.g. Vercel), env is provided by the platform so this is a no-op.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const fromBackendDir = path.join(process.cwd(), '..', '.env');
  const result = dotenv.config({ path: fromBackendDir });
  if (result.error) {
    dotenv.config({ path: path.join(process.cwd(), '.env') });
  }
}


