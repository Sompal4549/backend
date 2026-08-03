import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/api-response';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const details = errors.array().map((error) => ({
      field: (error as { path?: string; param?: string }).path ?? (error as { param?: string }).param ?? 'unknown',
      message: (error as { msg?: string }).msg ?? 'Invalid value',
    }));
    errorResponse(res, 'Validation failed', 400, details);
    return;
  }
  next();
};
