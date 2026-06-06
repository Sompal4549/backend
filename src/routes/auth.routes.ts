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
} from '../controllers/auth.controller.ts';
import { validateRequest } from '../middlewares/validate.middleware.ts';
import { body } from 'express-validator';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().isMobilePhone('any').withMessage('Valid phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validateRequest,
  register
);

authRouter.post(
  '/login',
  [body('email').notEmpty().withMessage('Email or phone is required'), body('password').notEmpty().withMessage('Password is required')],
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

// Alias for frontend sendEmailOtp
authRouter.post(
  '/send-email-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('purpose').optional().isString().trim(),
  ],
  validateRequest,
  sendEmailOtp
);

authRouter.post(
  '/email-otp/verify',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isNumeric().isLength({ min: 4, max: 10 }).withMessage('Valid OTP is required'),
    body('purpose').default('SPEAKER').isString().trim(),
  ],
  validateRequest,
  confirmEmailOtp
);

// Alias for frontend verifyEmailOtp
authRouter.post(
  '/verify-email-otp',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').isNumeric().withMessage('Valid OTP is required'),
    body('purpose').default('SPEAKER').isString().trim(),
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

// Alias for frontend sendPhoneOtp
authRouter.post(
  '/send-phone-otp',
  [
    body('phone').isMobilePhone('any').withMessage('Valid phone is required'),
    body('purpose').optional().isString().trim(),
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

// Alias for frontend verifyPhoneOtp
authRouter.post(
  '/verify-phone-otp',
  [
    body('phone').isMobilePhone('any').withMessage('Valid phone is required'),
    body('otp').isNumeric().withMessage('Valid OTP is required'),
    body('purpose').default('CONTACT').isString().trim(),
  ],
  validateRequest,
  confirmWhatsAppOtp
);
