/**
 * GET /api/motion-snapshot
 *
 * Returns a lightweight summary of the local motion-export.json:
 * only project names and task names.
 *
 * Requires a valid Nexto JWT.
 */
import express, { type Request, type Response } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// All endpoints require a valid Nexto JWT
router.use(authMiddleware);

router.get('/', async (_req: Request, res: Response) => {
  const snapshotPath = path.join(__dirname, '../../motion-export.json');

  let raw: string;
  try {
    raw = await readFile(snapshotPath, 'utf-8');
  } catch {
    return ResponseHelper.notFound(res, 'motion-export.json (run the export first)');
  }

  let snapshot: { workspaces?: Array<{ projects?: Array<{ id: string; name: string }>; tasks?: Array<{ id: string; name: string }> }> };
  try {
    snapshot = JSON.parse(raw) as typeof snapshot;
  } catch {
    return ResponseHelper.internalError(res, 'motion-export.json is not valid JSON');
  }

  const projects: { id: string; name: string }[] = [];
  const tasks: { id: string; name: string }[] = [];

  for (const ws of snapshot.workspaces ?? []) {
    for (const p of ws.projects ?? []) {
      projects.push({ id: p.id, name: p.name });
    }
    for (const t of ws.tasks ?? []) {
      tasks.push({ id: t.id, name: t.name });
    }
  }

  ResponseHelper.success(res, { projects, tasks }, 'Motion snapshot summary');
});

export default router;
