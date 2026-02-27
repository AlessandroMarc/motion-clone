import express, { type Request, type Response } from 'express';
import { ScheduleService } from '../services/scheduleService.js';
import type {
  CreateProjectScheduleInput,
  UpdateProjectScheduleInput,
  CreateTaskScheduleInput,
  UpdateTaskScheduleInput,
} from '../types/database.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();
const scheduleService = new ScheduleService();

// Apply auth middleware to all routes
router.use(authMiddleware);

// ─── Project Schedule Routes ──────────────────────────────────────────────────

// GET /api/schedules/projects/:projectId - Get active project schedule
router.get('/projects/:projectId', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { projectId } = req.params;
    if (!projectId || typeof projectId !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Project ID is required and must be a string'
      );
    }
    const projectSchedule = await scheduleService.getProjectSchedule(
      projectId,
      authReq.authToken
    );

    if (!projectSchedule) {
      return ResponseHelper.notFound(res, 'Project schedule');
    }

    ResponseHelper.single(
      res,
      projectSchedule,
      'Project schedule retrieved successfully'
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// POST /api/schedules/projects/:projectId - Create project schedule
router.post('/projects/:projectId', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { projectId } = req.params;
    if (!projectId || typeof projectId !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Project ID is required and must be a string'
      );
    }
    const input: CreateProjectScheduleInput = {
      ...req.body,
      project_id: projectId,
    };
    const projectSchedule = await scheduleService.createProjectSchedule(
      input,
      authReq.authToken
    );
    ResponseHelper.created(
      res,
      projectSchedule,
      'Project schedule created successfully'
    );
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// PATCH /api/schedules/projects/:projectId/:id - Update project schedule
router.patch(
  '/projects/:projectId/:id',
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
      const { projectId, id } = req.params;
      if (!projectId || !id) {
        return ResponseHelper.badRequest(
          res,
          'Project ID and schedule entry ID are required'
        );
      }
      const input: UpdateProjectScheduleInput = req.body;
      const projectSchedule = await scheduleService.updateProjectSchedule(
        id,
        projectId,
        input,
        authReq.authToken
      );
      ResponseHelper.updated(
        res,
        projectSchedule,
        'Project schedule updated successfully'
      );
    } catch (error) {
      ResponseHelper.badRequest(
        res,
        error instanceof Error ? error.message : 'Bad request'
      );
    }
  }
);

// DELETE /api/schedules/projects/:projectId/:id - Delete project schedule
router.delete(
  '/projects/:projectId/:id',
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
      const { projectId, id } = req.params;
      if (!projectId || !id) {
        return ResponseHelper.badRequest(
          res,
          'Project ID and schedule entry ID are required'
        );
      }
      await scheduleService.deleteProjectSchedule(
        id,
        projectId,
        authReq.authToken
      );
      ResponseHelper.deleted(res, 'Project schedule deleted successfully');
    } catch (error) {
      ResponseHelper.internalError(
        res,
        error instanceof Error ? error.message : 'Internal server error'
      );
    }
  }
);

// ─── Task Schedule Routes ─────────────────────────────────────────────────────

// GET /api/schedules/tasks/:taskId - Get active task schedule
router.get('/tasks/:taskId', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { taskId } = req.params;
    if (!taskId || typeof taskId !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Task ID is required and must be a string'
      );
    }
    const taskSchedule = await scheduleService.getTaskSchedule(
      taskId,
      authReq.authToken
    );

    if (!taskSchedule) {
      return ResponseHelper.notFound(res, 'Task schedule');
    }

    ResponseHelper.single(
      res,
      taskSchedule,
      'Task schedule retrieved successfully'
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// POST /api/schedules/tasks/:taskId - Create task schedule
router.post('/tasks/:taskId', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { taskId } = req.params;
    if (!taskId || typeof taskId !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Task ID is required and must be a string'
      );
    }
    const input: CreateTaskScheduleInput = {
      ...req.body,
      task_id: taskId,
    };
    const taskSchedule = await scheduleService.createTaskSchedule(
      input,
      authReq.authToken
    );
    ResponseHelper.created(res, taskSchedule, 'Task schedule created successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// PATCH /api/schedules/tasks/:taskId/:id - Update task schedule
router.patch('/tasks/:taskId/:id', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { taskId, id } = req.params;
    if (!taskId || !id) {
      return ResponseHelper.badRequest(
        res,
        'Task ID and schedule entry ID are required'
      );
    }
    const input: UpdateTaskScheduleInput = req.body;
    const taskSchedule = await scheduleService.updateTaskSchedule(
      id,
      taskId,
      input,
      authReq.authToken
    );
    ResponseHelper.updated(
      res,
      taskSchedule,
      'Task schedule updated successfully'
    );
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// DELETE /api/schedules/tasks/:taskId/:id - Delete task schedule
router.delete('/tasks/:taskId/:id', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { taskId, id } = req.params;
    if (!taskId || !id) {
      return ResponseHelper.badRequest(
        res,
        'Task ID and schedule entry ID are required'
      );
    }
    await scheduleService.deleteTaskSchedule(id, taskId, authReq.authToken);
    ResponseHelper.deleted(res, 'Task schedule deleted successfully');
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// ─── Effective Schedule Resolution ───────────────────────────────────────────

// GET /api/schedules/effective/:taskId - Get effective schedule for a task
router.get('/effective/:taskId', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { taskId } = req.params;
    if (!taskId || typeof taskId !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Task ID is required and must be a string'
      );
    }
    const schedule = await scheduleService.getEffectiveSchedule(
      taskId,
      authReq.authToken
    );
    ResponseHelper.single(
      res,
      schedule,
      'Effective schedule retrieved successfully'
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
