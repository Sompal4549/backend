import { Router } from 'express';
import {
  confirmEmailOtp,
  confirmWhatsAppOtp,
  login,
  logout,
  refreshToken,
  register,
  sendEmailOtp,
  sendWhatsAppOtp,
} from '../controllers/auth.controller.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { body } from 'express-validator';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone('any').withMessage('Valid phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validateRequest,
  register
);

authRouter.post(
  '/login',
  [body('email').isEmail().withMessage('Valid email is required'), body('password').notEmpty().withMessage('Password is required')],
  validateRequest,
  login
);

authRouter.post('/logout', logout);

authRouter.post('/refresh-token', refreshToken);

authRouter.post(
  '/email-otp/send',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('purpose').optional().isString().trim(),
    body('message').optional().isString().trim(),
  ],
  validateRequest,
  sendEmailOtp
);

authRouter.post(
  '/email-otp/verify',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isLength({ min: 4, max: 10 }).isNumeric().withMessage('Valid OTP is required'),
    body('purpose').optional().isString().trim(),
  ],
  validateRequest,
  confirmEmailOtp
);

authRouter.post(
  '/whatsapp-otp/send',
  [
    body('phone').isMobilePhone('any').withMessage('Valid phone is required'),
    body('purpose').optional().isString().trim(),
    body('message').optional().isString().trim(),
  ],
  validateRequest,
  sendWhatsAppOtp
);

authRouter.post(
  '/whatsapp-otp/verify',
  [
    body('phone').isMobilePhone('any').withMessage('Valid phone is required'),
    body('otp').isLength({ min: 4, max: 10 }).isNumeric().withMessage('Valid OTP is required'),
    body('purpose').optional().isString().trim(),
  ],
  validateRequest,
  confirmWhatsAppOtp
);
