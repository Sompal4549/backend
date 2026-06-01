import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/api-response';

export const notFoundHandler = (_req: Request, res: Response, _next: NextFunction): void => {
  errorResponse(res, 'Resource not found', 404);
};
