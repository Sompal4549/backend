import { Router } from 'express';
import { requestOtp, verifyOtp } from '../controllers/otpController';

export const otpRouter = Router();

otpRouter.post('/request', requestOtp);
otpRouter.post('/verify', verifyOtp);
