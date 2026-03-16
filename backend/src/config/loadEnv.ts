import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let loaded = false;

/**
 * Load .env once. Resolves paths relative to this file's location
 * (backend/src/config/) so it works regardless of process.cwd().
 *
 * Load order (last wins via `override`):
 *   1. repoRoot/.env              — shared env vars
 *   2. backend/.env.development.local — backend-specific secrets (SUPABASE_JWT_SECRET etc.)
 *
 * In production (e.g. Vercel), env is provided by the platform so this is a no-op.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  // __dirname = backend/src/config → ../../.. = repo root
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const backendDir = path.resolve(__dirname, '..', '..');

  // 1. Root .env (shared vars)
  dotenv.config({ path: path.join(repoRoot, '.env') });

  // 2. backend/.env.development.local (backend-specific secrets, overrides root)
  dotenv.config({
    path: path.join(backendDir, '.env.development.local'),
    override: true,
  });
}
