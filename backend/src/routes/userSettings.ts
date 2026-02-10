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
router.get('/active-schedule', async (req: AuthRequest, res: Response) => {
  try {
    // Use authenticated userId only - never trust client-provided user_id
    const userId = req.userId!;
    const client = req.supabaseClient;

    const schedule = await userSettingsService.getActiveSchedule(
      userId,
      client
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
    // Use authenticated userId only - never trust client-provided user_id
    const userId = req.userId!;
    const client = req.supabaseClient;

    const schedules = await userSettingsService.getUserSchedules(
      userId,
      client
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
    const client = req.supabaseClient;
    // Override user_id with authenticated user - never trust client input
    const input: CreateScheduleInput = {
      ...req.body,
      user_id: req.userId!,
    };

    const schedule = await userSettingsService.createSchedule(input, client);
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
    // Use authenticated userId only - never trust client-provided user_id
    const userId = req.userId!;
    const input: UpdateScheduleInput = req.body;
    const client = req.supabaseClient;

    if (!id) {
      return ResponseHelper.badRequest(res, 'Schedule ID is required');
    }

    const schedule = await userSettingsService.updateSchedule(
      id,
      userId,
      input,
      client
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
    // Use authenticated userId only - never trust client-provided user_id
    const userId = req.userId!;
    const client = req.supabaseClient;

    const settings = await userSettingsService.getUserSettings(userId, client);
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
    const client = req.supabaseClient;
    // Override user_id with authenticated user - never trust client input
    const input: CreateUserSettingsInput = {
      ...req.body,
      user_id: req.userId!,
    };

    const settings = await userSettingsService.upsertUserSettings(
      input,
      client
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
    // Use authenticated userId only - never trust client-provided user_id
    const userId = req.userId!;
    const input: UpdateUserSettingsInput = req.body;
    const client = req.supabaseClient;

    const settings = await userSettingsService.updateUserSettings(
      userId,
      input,
      client
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
    // Use authenticated userId only - never trust client-provided user_id
    const userId = req.userId!;
    const client = req.supabaseClient;

    const status = await userSettingsService.getOnboardingStatus(
      userId,
      client
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
    // Use authenticated userId only - never trust client-provided user_id
    const userId = req.userId!;
    const step = req.body?.step as OnboardingStep;
    const client = req.supabaseClient;

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
      userId,
      step,
      client
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
    // Use authenticated userId only - never trust client-provided user_id
    const userId = req.userId!;
    const client = req.supabaseClient;

    const settings = await userSettingsService.completeOnboarding(
      userId,
      client
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
