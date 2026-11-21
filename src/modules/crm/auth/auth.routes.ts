import { Router } from 'express';
import { crmAuthController } from './auth.controller';

export const crmAuthRouter = Router();

crmAuthRouter.post('/login', crmAuthController.login);
crmAuthRouter.post('/verify-otp', crmAuthController.verifyOtp);
crmAuthRouter.post('/verify-2fa', crmAuthController.verifyOtp);
crmAuthRouter.post('/resend-otp', (_req, res) => res.status(204).end());
crmAuthRouter.get('/users/:userId', crmAuthController.getUserById);

export default crmAuthRouter;
