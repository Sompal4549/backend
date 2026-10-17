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
} from '../controllers/auth.controller';
import {
  handleUnifiedLogin,
  handleVerify2FA,
  handleSetup2FA,
  handleConfirm2FA,
  handleGetMe,
} from '../controllers/admin-auth.controller';
import {
  adminForgotPassword,
  adminResetPassword,
} from '../controllers/admin.controller';
import { validateRequest } from '../middlewares/validate.middleware';
import { body } from 'express-validator';

export const authRouter = Router();

authRouter.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().isMobilePhone('any').withMessage('Valid phone is required'),
  ],
  validateRequest,
  register
);

authRouter.post(
  '/login',
  handleUnifiedLogin,
  [
    body('phone').notEmpty().isMobilePhone('any').withMessage('Valid phone is required'),
    body('otp').notEmpty().withMessage('OTP is required')
  ],
  validateRequest,
  login
);

authRouter.post('/verify-2fa', handleVerify2FA);
authRouter.get('/setup-2fa', handleSetup2FA);
authRouter.post('/confirm-2fa', handleConfirm2FA);
authRouter.get('/me', handleGetMe);
authRouter.post('/forgot-password', adminForgotPassword);
authRouter.post('/reset-password', adminResetPassword);
authRouter.post('/logout', logout);

// Dual-token refresh: accepts { refreshToken } from body or refreshToken cookie
// Access token expires in 15m, refresh token expires in 7d with rotation on each use
authRouter.post('/refresh-token', [
  body('refreshToken').optional().isString().notEmpty().withMessage('Refresh token must be a non-empty string'),
], validateRequest, refreshToken);
authRouter.post('/refresh', [
  body('refreshToken').optional().isString().notEmpty().withMessage('Refresh token must be a non-empty string'),
], validateRequest, refreshToken);

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
