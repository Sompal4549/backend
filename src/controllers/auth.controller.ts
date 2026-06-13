import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { registerUser, loginUser, refreshAccessToken, logoutUser } from '../services/auth.service';
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

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      errorResponse(res, 'Email is required', 400);
      return;
    }
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      errorResponse(res, 'User with this email does not exist', 404);
      return;
    }
    await requestEmailOtp(email, 'password-reset', 'Your password reset code is: {{code}}');
    successResponse(res, null, 'Reset code sent to email');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const verifyResetCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      errorResponse(res, 'Email and OTP are required', 400);
      return;
    }
    await verifyEmailOtp(email, otp, 'password-reset');
    
    // OTP sahi hai, ab ek temporary reset token generate karo (valid for 1 hour)
    const resetToken = jwt.sign({ email: email.toLowerCase().trim(), type: 'password-reset' }, config.jwtAccessSecret, { expiresIn: '1h' });
    
    successResponse(res, { resetToken }, 'OTP verified. You can now reset your password.');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      errorResponse(res, 'Reset token and new password are required', 400);
      return;
    }

    // Token verify karo
    const decoded = jwt.verify(resetToken, config.jwtAccessSecret) as { email: string; type: string };
    if (decoded.type !== 'password-reset') {
      errorResponse(res, 'Invalid reset token', 400);
      return;
    }

    const user = await UserModel.findOne({ email: decoded.email });
    if (!user) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    user.password = newPassword; // Pre-save hook will hash this
    await user.save();
    successResponse(res, null, 'Password reset successful');
  } catch (error) {
    const message = error instanceof jwt.JsonWebTokenError ? 'Reset token expired or invalid' : (error as Error).message;
    errorResponse(res, message, 400);
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
