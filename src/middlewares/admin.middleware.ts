import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { errorResponse } from '../utils/api-response.js';
import { ROLE } from '../constants/roles.constants.js';

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== ROLE.ADMIN) {
    errorResponse(res, 'Admin access required', 403);
    return;
  }
  next();
};
