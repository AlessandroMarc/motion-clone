import express, { type Request, type Response } from 'express';
import { MilestoneService } from '../services/milestoneService.js';
import type {
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '../types/database.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const milestoneService = new MilestoneService();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/milestones - Get all milestones
router.get('/', async (req: Request, res: Response) => {
  try {
    const { project_id, status } = req.query;

    let milestones;
    if (project_id && typeof project_id === 'string') {
      milestones = await milestoneService.getMilestonesByProjectId(project_id);
    } else if (status && typeof status === 'string') {
      milestones = await milestoneService.getMilestonesByStatus(
        status as 'not-started' | 'in-progress' | 'completed'
      );
    } else {
      milestones = await milestoneService.getAllMilestones();
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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Milestone ID is required and must be a string'
      );
    }
    const milestone = await milestoneService.getMilestoneById(id);

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
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateMilestoneInput = req.body;
    const milestone = await milestoneService.createMilestone(input);
    ResponseHelper.created(res, milestone, 'Milestone created successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// PUT /api/milestones/:id - Update milestone
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Milestone ID is required and must be a string'
      );
    }
    const input: UpdateMilestoneInput = req.body;
    const milestone = await milestoneService.updateMilestone(id, input);
    ResponseHelper.updated(res, milestone, 'Milestone updated successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// DELETE /api/milestones/:id - Delete milestone
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Milestone ID is required and must be a string'
      );
    }
    await milestoneService.deleteMilestone(id);
    ResponseHelper.deleted(res, 'Milestone deleted successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
