import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { LeadModel } from '../models/lead.model';
import { config } from '../config/app.config';
import { errorResponse } from '../utils/api-response';
import { UserDocument } from '../models/user.model';
import { ILead } from '../models/lead.model';
import { runWithActivityContext } from '../utils/activity-context';

export interface AuthRequest extends Request {
  user?: UserDocument | ILead;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errorResponse(res, 'Authorization token required', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwtAccessSecret) as { userId?: string; leadId?: string; role?: string };

    // Lead token
    if (payload.leadId) {
      const lead = await LeadModel.findById(payload.leadId);
      if (!lead) {
        errorResponse(res, 'Invalid token', 401);
        return;
      }
      req.user = lead;
      runWithActivityContext(
        {
          userId: String(lead._id),
          userName: `${lead.firstName} ${lead.lastName}`,
          userRole: 'lead',
        },
        next
      );
      return;
    }

    // Admin/Superadmin token
    const user = await UserModel.findById(payload.userId).select('+refreshToken');
    if (!user) {
      errorResponse(res, 'Invalid token user', 401);
      return;
    }
    req.user = user;
    runWithActivityContext(
      {
        userId: String(user._id),
        userName: user.name,
        userRole: user.role,
      },
      next
    );
  } catch {
    errorResponse(res, 'Invalid or expired token', 401);
  }
};
