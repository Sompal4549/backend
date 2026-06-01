import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/api-response';

export const errorHandler = (
  err: Error & { statusCode?: number; errors?: unknown },
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  errorResponse(res, message, statusCode, err.errors || null);
};
