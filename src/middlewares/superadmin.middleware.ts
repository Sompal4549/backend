import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.js';
import { ROLE } from '../constants/roles.constants';
import { errorResponse } from '../utils/api-response.js';

export const superAdminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === ROLE.SUPERADMIN) {
    next();
  } else {
    errorResponse(res, 'Super Admin access required', 403);
  }
};