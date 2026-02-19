import express, { type Request, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { UserSettingsService } from '../services/userSettingsService.js';
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateUserSettingsInput,
  UpdateUserSettingsInput,
} from '../types/userSettings.js';
import type { OnboardingStep } from '../types/database.js';
import { ResponseHelper } from '../utils/responseHelpers.js';

const router = express.Router();
const userSettingsService = new UserSettingsService();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/user-settings/active-schedule - Get active schedule for user
router.get('/active-schedule', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const schedule = await userSettingsService.getActiveSchedule(
      authReq.userId,
      authReq.authToken
    );
    ResponseHelper.success(
      res,
      schedule,
      'Active schedule retrieved successfully'
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// GET /api/user-settings/schedules - Get all schedules for user
router.get('/schedules', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const schedules = await userSettingsService.getUserSchedules(
      authReq.userId,
      authReq.authToken
    );
    ResponseHelper.list(
      res,
      schedules,
      'Schedules retrieved successfully',
      schedules.length
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// POST /api/user-settings/schedules - Create a new schedule
router.post('/schedules', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const input: CreateScheduleInput = {
      ...req.body,
      user_id: authReq.userId,
    };

    const schedule = await userSettingsService.createSchedule(
      input,
      authReq.authToken
    );
    ResponseHelper.created(res, schedule, 'Schedule created successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// PUT /api/user-settings/schedules/:id - Update a schedule
router.put('/schedules/:id', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { id } = req.params;
    const input: UpdateScheduleInput = req.body;

    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Schedule ID is required and must be a string'
      );
    }

    const schedule = await userSettingsService.updateSchedule(
      id,
      authReq.userId,
      input,
      authReq.authToken
    );
    ResponseHelper.success(res, schedule, 'Schedule updated successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// DELETE /api/user-settings/schedules/:id - Delete a schedule
router.delete('/schedules/:id', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return ResponseHelper.badRequest(
        res,
        'Schedule ID is required and must be a string'
      );
    }

    await userSettingsService.deleteSchedule(
      id,
      authReq.userId,
      authReq.authToken
    );
    ResponseHelper.success(res, null, 'Schedule deleted successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// GET /api/user-settings - Get user settings
router.get('/', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const settings = await userSettingsService.getUserSettings(
      authReq.userId,
      authReq.authToken
    );
    ResponseHelper.success(
      res,
      settings,
      'User settings retrieved successfully'
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// POST /api/user-settings - Create or update user settings
router.post('/', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const input: CreateUserSettingsInput = {
      ...req.body,
      user_id: authReq.userId,
    };

    const settings = await userSettingsService.upsertUserSettings(
      input,
      authReq.authToken
    );
    ResponseHelper.created(res, settings, 'User settings created successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// PUT /api/user-settings - Update user settings
router.put('/', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const input: UpdateUserSettingsInput = req.body;

    const settings = await userSettingsService.updateUserSettings(
      authReq.userId,
      input,
      authReq.authToken
    );
    ResponseHelper.success(res, settings, 'User settings updated successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// GET /api/user-settings/onboarding/status - Get onboarding status
router.get('/onboarding/status', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const status = await userSettingsService.getOnboardingStatus(
      authReq.userId,
      authReq.authToken
    );
    ResponseHelper.success(
      res,
      status,
      'Onboarding status retrieved successfully'
    );
  } catch (error) {
    ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

// PUT /api/user-settings/onboarding/step - Update onboarding step
router.put('/onboarding/step', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const step = req.body?.step as OnboardingStep;

    if (
      step !== null &&
      step !== 'task_created' &&
      step !== 'project_created' &&
      step !== 'scheduled' &&
      step !== 'calendar_synced'
    ) {
      return ResponseHelper.badRequest(
        res,
        'Invalid onboarding step. Must be: task_created, project_created, scheduled, calendar_synced, or null'
      );
    }

    const settings = await userSettingsService.updateOnboardingStep(
      authReq.userId,
      step,
      authReq.authToken
    );
    ResponseHelper.success(
      res,
      settings,
      'Onboarding step updated successfully'
    );
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// PUT /api/user-settings/onboarding/complete - Complete onboarding
router.put('/onboarding/complete', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const settings = await userSettingsService.completeOnboarding(
      authReq.userId,
      authReq.authToken
    );
    ResponseHelper.success(res, settings, 'Onboarding completed successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

export default router;
