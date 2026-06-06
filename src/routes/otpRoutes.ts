import { Router } from 'express';
import { requestOtp, verifyOtp } from '../controllers/otpController.js';

export const otpRouter = Router();

otpRouter.post('/request', requestOtp);
otpRouter.post('/verify', verifyOtp);
