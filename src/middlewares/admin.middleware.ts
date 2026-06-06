import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { errorResponse } from '../utils/api-response.js';
import { ROLE } from '../constants/roles.constants';

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const isAuthorized = req.user && (req.user.role === ROLE.ADMIN || req.user.role === ROLE.SUPERADMIN);
  if (!isAuthorized) {
    errorResponse(res, 'Admin access required', 403);
    return;
  }
  next();
};
