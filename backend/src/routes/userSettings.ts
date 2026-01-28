import express, { type Request, type Response } from 'express';
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

// GET /api/user-settings/active-schedule - Get active schedule for user
router.get('/active-schedule', async (req: Request, res: Response) => {
  try {
    const userId = req.query?.user_id as string;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const schedule = await userSettingsService.getActiveSchedule(userId);
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
  try {
    const userId = req.query?.user_id as string;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const schedules = await userSettingsService.getUserSchedules(userId);
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
  try {
    const input: CreateScheduleInput = req.body;

    if (!input.user_id) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const schedule = await userSettingsService.createSchedule(input);
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
  try {
    const { id } = req.params;
    const userId = (req.query?.user_id || req.body?.user_id) as string;
    const input: UpdateScheduleInput = req.body;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    if (!id) {
      return ResponseHelper.badRequest(res, 'Schedule ID is required');
    }

    const schedule = await userSettingsService.updateSchedule(
      id,
      userId,
      input
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
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query?.user_id as string;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const settings = await userSettingsService.getUserSettings(userId);
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
  try {
    const input: CreateUserSettingsInput = req.body;

    if (!input.user_id) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const settings = await userSettingsService.upsertUserSettings(input);
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
  try {
    const userId = (req.query?.user_id || req.body?.user_id) as string;
    const input: UpdateUserSettingsInput = req.body;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const settings = await userSettingsService.updateUserSettings(
      userId,
      input
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
  try {
    const userId = req.query?.user_id as string;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const status = await userSettingsService.getOnboardingStatus(userId);
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
  try {
    const userId = (req.query?.user_id || req.body?.user_id) as string;
    const step = req.body?.step as OnboardingStep;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

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
      step
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
  try {
    const userId = (req.query?.user_id || req.body?.user_id) as string;

    if (!userId) {
      return ResponseHelper.badRequest(res, 'User ID is required');
    }

    const settings = await userSettingsService.completeOnboarding(userId);
    ResponseHelper.success(res, settings, 'Onboarding completed successfully');
  } catch (error) {
    ResponseHelper.badRequest(
      res,
      error instanceof Error ? error.message : 'Bad request'
    );
  }
});

export default router;
