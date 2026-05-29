import { Request, Response } from 'express';
import { registerUser, loginUser, refreshAccessToken, logoutUser } from '../services/auth.service.js';
import { requestEmailOtp, requestWhatsAppOtp, verifyEmailOtp, verifyWhatsAppOtp } from '../services/otp.service.js';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helper.js';
import { successResponse, errorResponse } from '../utils/api-response.js';

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
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUser(email, password);
    console.log('Generated refresh token:', refreshToken, accessToken);
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
    await logoutUser(refreshTokenValue, res);
    successResponse(res, null, 'Logged out successfully');
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
    const result = await requestWhatsAppOtp(req.body.phone, req.body.purpose, req.body.message);
    successResponse(res, result, 'WhatsApp OTP sent');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const confirmWhatsAppOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await verifyWhatsAppOtp(req.body.phone, req.body.otp, req.body.purpose);
    successResponse(res, result, 'WhatsApp phone verified');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
