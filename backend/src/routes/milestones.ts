import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { MilestoneService } from '../services/milestoneService.js';
import type {
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '../types/database.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const milestoneService = new MilestoneService();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/milestones - Get all milestones
router.get('/', async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as unknown as AuthRequest;
  try {
    const { project_id, status } = authReq.query;
    const client = authReq.supabaseClient;

    let milestones;
    if (project_id && typeof project_id === 'string') {
      milestones = await milestoneService.getMilestonesByProjectId(
        project_id,
        client
      );
    } else if (status && typeof status === 'string') {
      milestones = await milestoneService.getMilestonesByStatus(
        status as 'not-started' | 'in-progress' | 'completed',
        client
      );
    } else {
      milestones = await milestoneService.getAllMilestones(client);
    }

    ResponseHelper.list(
      res,
      milestones,
      'Milestones retrieved successfully',
      milestones.length
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// GET /api/milestones/:id - Get milestone by ID
router.get('/:id', async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as unknown as AuthRequest;
  try {
    const { id } = authReq.params;
    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Milestone ID is required and must be a string'
      );
    }
    const milestone = await milestoneService.getMilestoneById(
      id,
      authReq.supabaseClient
    );

    if (!milestone) {
      return ResponseHelper.notFound(res, 'Milestone');
    }

    ResponseHelper.single(res, milestone, 'Milestone retrieved successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// POST /api/milestones - Create new milestone
router.post('/', async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as unknown as AuthRequest;
  try {
    const input: CreateMilestoneInput = {
      ...authReq.body,
      user_id: authReq.userId, // Although milestones don't have user_id in type, the RLS might need the client
    };
    const milestone = await milestoneService.createMilestone(
      input,
      authReq.supabaseClient
    );
    ResponseHelper.created(res, milestone, 'Milestone created successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// PUT /api/milestones/:id - Update milestone
router.put('/:id', async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as unknown as AuthRequest;
  try {
    const { id } = authReq.params;
    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Milestone ID is required and must be a string'
      );
    }
    const input: UpdateMilestoneInput = authReq.body;
    const milestone = await milestoneService.updateMilestone(
      id,
      input,
      authReq.supabaseClient
    );
    ResponseHelper.updated(res, milestone, 'Milestone updated successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// DELETE /api/milestones/:id - Delete milestone
router.delete('/:id', async (req: Request, res: Response, _next: NextFunction) => {
  const authReq = req as unknown as AuthRequest;
  try {
    const { id } = authReq.params;
    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Milestone ID is required and must be a string'
      );
    }
    await milestoneService.deleteMilestone(id, authReq.supabaseClient);
    ResponseHelper.deleted(res, 'Milestone deleted successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
