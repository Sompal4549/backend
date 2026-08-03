import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/app-error';
import { errorResponse } from '../utils/api-response';
import { config } from '../config/app.config';

interface NormalizedError {
  statusCode: number;
  message: string;
  details?: unknown;
}

const normalizeError = (err: unknown): NormalizedError => {
  if (err instanceof AppError) {
    return { statusCode: err.statusCode, message: err.message, details: err.details };
  }

  if (err instanceof mongoose.Error.CastError || (err as { name?: string })?.name === 'CastError') {
    return { statusCode: 400, message: 'Invalid resource identifier' };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return { statusCode: 400, message: err.message };
  }

  const anyErr = err as { code?: number; name?: string; message?: string };

  if (anyErr?.code === 11000) {
    return { statusCode: 409, message: 'Duplicate value for a unique field' };
  }

  if (anyErr?.name === 'TokenExpiredError' || anyErr?.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid or expired token' };
  }

  return {
    statusCode: 500,
    message: config.env === 'development' ? (anyErr?.message ?? 'Internal server error') : 'Internal server error',
  };
};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const { statusCode, message, details } = normalizeError(err);

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  } else {
    console.warn(`[${req.method} ${req.originalUrl}] ${statusCode} ${message}`);
  }

  errorResponse(res, message, statusCode, details);
};
