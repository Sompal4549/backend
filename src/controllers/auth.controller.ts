import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';
import { registerUser, refreshAccessToken, logoutUser } from '../services/auth.service';
import { requestEmailOtp, requestWhatsAppOtp, verifyEmailOtp, verifyWhatsAppOtp } from '../services/otp.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helper';
import { successResponse, errorResponse } from '../utils/api-response';
import { config } from '../config/app.config';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await registerUser(req.body);
    successResponse(res, { user }, 'User registered', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      errorResponse(res, 'Phone and OTP are required', 400);
      return;
    }

    // Unified purpose for authentication
    await verifyWhatsAppOtp(phone, otp, 'login');

    const user = await UserModel.findOne({ phone });
    if (!user) {
      errorResponse(res, 'User not found with this mobile number. Please register.', 404);
      return;
    }

    const accessToken = jwt.sign({ id: user._id, role: user.role }, config.jwtAccessSecret, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: user._id }, config.jwtAccessSecret, { expiresIn: '7d' });

    setRefreshTokenCookie(res, refreshToken);
    successResponse(res, { user, accessToken }, 'Login successful');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshTokenValue = req.cookies.refreshToken;
    if (!refreshTokenValue) {
      clearRefreshTokenCookie(res);
      successResponse(res, null, 'Already logged out');
      return;
    }
    const result = await logoutUser(refreshTokenValue, res, ['user']);
    if (result) {
      successResponse(res, null, 'Logged out successfully');
    } else {
      errorResponse(res, 'Invalid logout context for this role', 403);
    }
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshTokenValue = req.cookies.refreshToken;
    if (!refreshTokenValue) {
      errorResponse(res, 'Refresh token missing', 401);
      return;
    }
    const accessToken = await refreshAccessToken(refreshTokenValue, res);
    successResponse(res, { accessToken }, 'Access token refreshed');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const sendEmailOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await requestEmailOtp(req.body.email, req.body.purpose, req.body.message);
    successResponse(res, result, 'Email OTP sent');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const confirmEmailOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await verifyEmailOtp(req.body.email, req.body.otp, req.body.purpose);
    successResponse(res, result, 'Email verified');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const sendWhatsAppOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, purpose, message } = req.body;

    let effectivePurpose = purpose || 'login';

    // Agar admin-login hai, toh role check karo aur purpose 'admin-login' hi rehne do
    if (purpose === 'admin-login') {
      const user = await UserModel.findOne({ phone, role: { $in: [ROLE.ADMIN, ROLE.SUPERADMIN] } });
      if (!user) {
        errorResponse(res, 'Access denied. You are not an admin or credentials do not match.', 403);
        return;
      }
      effectivePurpose = 'admin-login';
    }

    // Use the effective purpose for the actual OTP generation
    const result = await requestWhatsAppOtp(phone, effectivePurpose, message);
    successResponse(res, result, 'WhatsApp OTP sent');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const confirmWhatsAppOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp, purpose } = req.body;

    // Use the provided purpose directly for verification
    const result = await verifyWhatsAppOtp(phone, otp, purpose || 'verification');
    successResponse(res, result, 'WhatsApp phone verified');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
