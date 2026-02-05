import { type Request, type Response, type NextFunction } from 'express';
import { ResponseHelper } from '../utils/responseHelpers.js';

export interface AuthRequest extends Request {
  authToken?: string;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ResponseHelper.badRequest(
      res,
      'Missing or invalid Authorization header'
    );
  }

  req.authToken = authHeader.substring(7); // Remove 'Bearer ' prefix
  next();
}
