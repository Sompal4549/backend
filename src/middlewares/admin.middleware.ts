import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.ts';
import { errorResponse } from '../utils/api-response.ts';
import { ROLE } from '../constants/roles.constants.ts';

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const isAuthorized = req.user && (req.user.role === ROLE.ADMIN || req.user.role === ROLE.SUPERADMIN);
  if (!isAuthorized) {
    errorResponse(res, 'Admin access required', 403);
    return;
  }
  next();
};
