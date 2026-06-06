import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { config } from '../config/app.config';
import { errorResponse } from '../utils/api-response';
import { UserDocument } from '../models/user.model';

export interface AuthRequest extends Request {
  user?: UserDocument;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errorResponse(res, 'Authorization token required', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwtAccessSecret) as { userId: string };
    const user = await UserModel.findById(payload.userId).select('+refreshToken');
    if (!user) {
      errorResponse(res, 'Invalid token user', 401);
      return;
    }
    req.user = user;
    next();
  } catch {
    errorResponse(res, 'Invalid or expired token', 401);
  }
};
