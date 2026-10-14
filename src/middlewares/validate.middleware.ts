import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { errorResponse } from '../utils/api-response';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const issues = errors.array().map((error) => {
      const field = (error as { path?: string; param?: string }).path ?? (error as { param?: string }).param ?? 'unknown';
      const message = (error as { msg?: string }).msg ?? 'Invalid value';
      return `${field}: ${message}`;
    });
    errorResponse(res, 'Validation failed', 400, issues);
    return;
  }
  next();
};
