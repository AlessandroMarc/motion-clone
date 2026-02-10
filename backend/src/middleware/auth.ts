import { type Request, type Response, type NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ResponseHelper } from '../utils/responseHelpers.js';
import {
  getAuthenticatedSupabase,
  verifyAuthToken,
} from '../config/supabase.js';

export interface AuthRequest extends Request {
  authToken: string;
  userId: string;
  supabaseClient: SupabaseClient;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authReq = req as AuthRequest;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ResponseHelper.unauthorized(
      res,
      'Missing or invalid Authorization header',
      'Please provide a valid Bearer token'
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  authReq.authToken = token;

  try {
    // Verify token locally (fast, < 1ms vs 100+ ms for remote call)
    const { userId } = verifyAuthToken(token);

    // Optional: Strict mode performs additional remote verification
    // Enable via STRICT_AUTH_MODE=true environment variable
    if (process.env.STRICT_AUTH_MODE === 'true') {
      const supabase = getAuthenticatedSupabase(token);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user || user.id !== userId) {
        return ResponseHelper.unauthorized(
          res,
          'Token validation failed',
          'Please login again'
        );
      }
    }

    // Attach user ID to request
    authReq.userId = userId;

    // Create and attach authenticated Supabase client to request
    // This eliminates the need for services to create their own clients
    authReq.supabaseClient = getAuthenticatedSupabase(token);

    next();
  } catch (error) {
    return ResponseHelper.unauthorized(
      res,
      error instanceof Error ? error.message : 'Failed to verify token',
      'Authentication failed'
    );
  }
}
