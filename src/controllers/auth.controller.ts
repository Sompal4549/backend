import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';
import { registerUser, refreshAccessToken, logoutUser } from '../services/auth.service';
import { requestEmailOtp, requestWhatsAppOtp, verifyEmailOtp, verifyWhatsAppOtp } from '../services/otp.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helper';
import { successResponse, errorResponse } from '../utils/api-response';
import { config } from '../config/app.config';
import { updateUserRefreshToken } from '../repositories/user.repository';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await registerUser(req.body);
    successResponse(res, { user }, 'User registered', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

// Phone number normalize helper (same as otp.service)
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      errorResponse(res, 'Phone and OTP are required', 400);
      return;
    }

    const normalizedPhone = normalizePhone(phone);

    // Verify OTP with 'login' purpose
    await verifyWhatsAppOtp(normalizedPhone, otp, 'login');

    // DB mein phone kisi bhi format mein ho sakta hai — last 10 digits se match
    const last10 = normalizedPhone.slice(-10);
    const phoneRegex = new RegExp(`${last10}$`);
    const user = await UserModel.findOne({ phone: { $regex: phoneRegex } });
    if (!user) {
      errorResponse(res, 'User not found with this mobile number. Please register.', 404);
      return;
    }

    const userIdStr = user._id.toString();
    const accessToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtAccessSecret, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtRefreshSecret, { expiresIn: '7d' });

    // ✅ FIX: refreshToken ko DB mein save karo (bcrypt hash)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await updateUserRefreshToken(userIdStr, hashedRefreshToken);

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

    // ✅ FIX: Phone normalize karo - OTP service bhi yahi karta hai internally
    const normalizedPhone = normalizePhone(phone);
    let effectivePurpose = purpose || 'login';

    // Agar admin-login hai, toh role check karo with flexible phone matching
    if (purpose === 'admin-login') {
      // DB mein phone kisi bhi format mein ho sakta hai (+91xxx, 91xxx, 0xxx)
      // Last 10 digits se match karte hain — ye India ke liye safest approach hai
      const last10 = normalizedPhone.slice(-10);
      const phoneRegex = new RegExp(`${last10}$`);

      const user = await UserModel.findOne({
        phone: { $regex: phoneRegex },
        role: { $in: [ROLE.ADMIN, ROLE.SUPERADMIN] },
      });

      if (!user) {
        errorResponse(res, 'Access denied. You are not an admin or credentials do not match.', 403);
        return;
      }
      effectivePurpose = 'admin-login';
    }

    // Normalized phone pass karo OTP service ko
    const result = await requestWhatsAppOtp(normalizedPhone, effectivePurpose, message);
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
