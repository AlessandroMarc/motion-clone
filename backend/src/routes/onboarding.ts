import express, { type Request, type Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { OnboardingEmailService } from '../services/onboardingEmailService.js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import { isValidEmail } from '../utils/email.js';

const router = express.Router();
const onboardingEmailService = new OnboardingEmailService();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/onboarding/start
 * Starts the onboarding email sequence for the authenticated user.
 * Idempotent – calling it more than once for the same user is safe.
 */
router.post('/start', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    const email = (req.body?.email || '').toString().trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return ResponseHelper.validationError(
        res,
        'A valid email address is required'
      );
    }

    await onboardingEmailService.startSequence(authReq.userId, email);

    return ResponseHelper.created(
      res,
      { userId: authReq.userId, email },
      'Onboarding email sequence started'
    );
  } catch (error) {
    return ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

/**
 * GET /api/onboarding/email-status
 * Returns the current status of the onboarding email sequence for the user.
 */
router.get('/email-status', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const sequence = await onboardingEmailService.getSequenceStatus(
      authReq.userId
    );

    return ResponseHelper.success(
      res,
      sequence,
      'Onboarding email sequence status retrieved'
    );
  } catch (error) {
    return ResponseHelper.internalError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
  }
});

export default router;
