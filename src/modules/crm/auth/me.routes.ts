import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { crmMeController } from './me.controller';
import { UserModel } from '../../../models/user.model';
import { config } from '../../../config/app.config';

export const crmMeRouter = Router();

// Permissive auth for SSR and API: extracts token if provided, never rejects SSR requests
crmMeRouter.use(async (req: any, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload: any = jwt.verify(token, config.jwtAccessSecret);
      if (payload?.userId) {
        const user = await UserModel.findById(payload.userId);
        if (user) req.user = user;
      }
    }
  } catch {
    // SSR or expired token - me.controller provides graceful fallback
  }
  next();
});

crmMeRouter.get('/me', crmMeController.getProfile);
crmMeRouter.put('/me/profile', crmMeController.updateProfile);
crmMeRouter.post('/me/password', crmMeController.changePassword);
crmMeRouter.post('/me/sessions/end', crmMeController.endSessions);

export default crmMeRouter;
