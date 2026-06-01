import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/api-response';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse(res, 'Validation failed', 400, errors.array());
    return;
  }
  next();
};
