import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware.ts';
import { ROLE } from '../constants/roles.constants.ts';
import { errorResponse } from '../utils/api-response.ts';

export const superAdminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === ROLE.SUPERADMIN) {
    next();
  } else {
    errorResponse(res, 'Super Admin access required', 403);
  }
};