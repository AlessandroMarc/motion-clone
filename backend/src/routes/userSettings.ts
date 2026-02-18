import express, { type Response } from 'express';
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
router.get('/active-schedule', async (req: AuthRequest, res: Response) => {
  try {
    const schedule = await userSettingsService.getActiveSchedule(
      req.userId,
      req.supabaseClient
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
router.get('/schedules', async (req: AuthRequest, res: Response) => {
  try {
    const schedules = await userSettingsService.getUserSchedules(
      req.userId,
      req.supabaseClient
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
router.post('/schedules', async (req: AuthRequest, res: Response) => {
  try {
    const input: CreateScheduleInput = {
      ...req.body,
      user_id: req.userId,
    };

    const schedule = await userSettingsService.createSchedule(
      input,
      req.supabaseClient
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
router.put('/schedules/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const input: UpdateScheduleInput = req.body;

    if (!id) {
      return ResponseHelper.badRequest(res, 'Schedule ID is required');
    }

    const schedule = await userSettingsService.updateSchedule(
      id,
      req.userId,
      input,
      req.supabaseClient
    );
    ResponseHelper.success(res, schedule, 'Schedule updated successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

// GET /api/user-settings - Get user settings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await userSettingsService.getUserSettings(
      req.userId,
      req.supabaseClient
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
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const input: CreateUserSettingsInput = {
      ...req.body,
      user_id: req.userId,
    };

    const settings = await userSettingsService.upsertUserSettings(
      input,
      req.supabaseClient
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
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const input: UpdateUserSettingsInput = req.body;

    const settings = await userSettingsService.updateUserSettings(
      req.userId,
      input,
      req.supabaseClient
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
router.get('/onboarding/status', async (req: AuthRequest, res: Response) => {
  try {
    const status = await userSettingsService.getOnboardingStatus(
      req.userId,
      req.supabaseClient
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
router.put('/onboarding/step', async (req: AuthRequest, res: Response) => {
  try {
    const step = req.body?.step as OnboardingStep;

    if (
      step !== null &&
      step !== 'task_created' &&
      step !== 'project_created' &&
      step !== 'scheduled'
    ) {
      return ResponseHelper.badRequest(
        res,
        'Invalid onboarding step. Must be: task_created, project_created, scheduled, or null'
      );
    }

    const settings = await userSettingsService.updateOnboardingStep(
      req.userId,
      step,
      req.supabaseClient
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
router.put('/onboarding/complete', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await userSettingsService.completeOnboarding(
      req.userId,
      req.supabaseClient
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
