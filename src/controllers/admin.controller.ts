import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';
import { verifyWhatsAppOtp } from '../services/otp.service';
import { config } from '../config/app.config';
import { getDashboardData, listUsers, listAllOrders, adminUpdateOrder, adminUpdateUserRole, listAllEnquiries, adminUpdateEnquiry } from '../services/admin.service';
import { logoutUser, registerUserWithRole } from '../services/auth.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helper';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { updateUserRefreshToken } from '../repositories/user.repository';

// Phone normalize helper
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

// Normalize identifier: strip spaces, +91, etc.
const normalizeIdentifier = (value: string) => value.replace(/\s+/g, '').replace(/^\+91/, '');

// Determine user by email or phone
const findUserByEmail = async (email: string) => {
  return await UserModel.findOne({ email: email.toLowerCase().trim() }).select('+password');
};

const findUserByPhone = async (phone: string) => {
  const normalized = normalizePhone(phone);
  const last10 = normalized.slice(-10);
  const phoneRegex = new RegExp(`${last10}$`);
  return await UserModel.findOne({ phone: { $regex: phoneRegex } }).select('+password');
};

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, phone, mobile, email, password, otp, totp, twoFactorCode, tempToken } = req.body;
  const effectiveId = identifier || phone || mobile || email;
  const effectiveCode = otp || totp || twoFactorCode;

  let user: any;

  if (tempToken) {
    // ─── Step 2: 2FA Verification via tempToken ───
    try {
      const decoded = jwt.verify(tempToken, config.jwtAccessSecret) as { userId: string; step?: string };
      user = await UserModel.findById(decoded.userId).select('+password');
    } catch {
      throw new AppError(401, '2FA session expired. Please sign in again.');
    }

    if (!user) {
      throw new AppError(404, 'Admin user not found');
    }

    if (!effectiveCode) {
      throw new AppError(400, 'Verification code is required');
    }

    const cleanCode = String(effectiveCode).trim().replace(/\s+/g, '');
    const bypassOtp = (process.env.OTP_BYPASS_OTP || '7678').trim();
    // Master codes are for local development only; production needs the real WhatsApp OTP
    const isBypass =
      process.env.NODE_ENV !== 'production' &&
      (cleanCode === '7678' || cleanCode === '767822' || cleanCode === '123456' || cleanCode === bypassOtp);

    if (!isBypass) {
      const normalizedPhone = user.phone ? normalizePhone(user.phone) : '';
      await verifyWhatsAppOtp(normalizedPhone, cleanCode, 'admin-login');
    }
  } else if (password) {
    // ─── Password check ───
    const normalizedId = normalizeIdentifier(effectiveId || '').trim();

    if (normalizedId.includes('@')) {
      user = await findUserByEmail(normalizedId);
    } else {
      user = await findUserByPhone(normalizedId);
    }

    if (!user) {
      throw new AppError(403, 'Invalid credentials. Email or phone not found.');
    }

    if (![ROLE.ADMIN, ROLE.SUPERADMIN].includes(user.role)) {
      throw new AppError(403, 'Access denied. You are not an admin.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError(403, 'Invalid credentials. Password does not match.');
    }

    // ─── 2FA CHALLENGE: If code not provided yet, require Authenticator / 2FA ───
    if (!effectiveCode) {
      const newTempToken = jwt.sign(
        { userId: user._id.toString(), step: '2fa' },
        config.jwtAccessSecret,
        { expiresIn: '10m' }
      );

      return successResponse(
        res,
        {
          requiresTwoFactor: true,
          tempToken: newTempToken,
          phone: user.phone ? `******${user.phone.slice(-4)}` : undefined,
          email: user.email ? `${user.email.slice(0, 3)}***@${user.email.split('@')[1]}` : undefined,
        },
        'Two-factor authentication required. Please enter verification code.'
      );
    }

    // If code is provided with password:
    const cleanCode = String(effectiveCode).trim().replace(/\s+/g, '');
    const bypassOtp = (process.env.OTP_BYPASS_OTP || '7678').trim();
    // Master codes are for local development only; production needs the real WhatsApp OTP
    const isBypass =
      process.env.NODE_ENV !== 'production' &&
      (cleanCode === '7678' || cleanCode === '767822' || cleanCode === '123456' || cleanCode === bypassOtp);

    if (!isBypass) {
      const normalizedPhone = user.phone ? normalizePhone(user.phone) : '';
      await verifyWhatsAppOtp(normalizedPhone, cleanCode, 'admin-login');
    }
  } else if (otp) {
    // ─── Direct OTP login ───
    if (!effectiveId || !otp) {
      throw new AppError(400, 'Phone and OTP are required');
    }

    const normalizedPhone = normalizePhone(effectiveId);
    await verifyWhatsAppOtp(normalizedPhone, otp, 'admin-login');

    const last10 = normalizedPhone.slice(-10);
    const phoneRegex = new RegExp(`${last10}$`);
    user = await UserModel.findOne({
      phone: { $regex: phoneRegex },
      role: { $in: [ROLE.ADMIN, ROLE.SUPERADMIN] },
    });

    if (!user) {
      throw new AppError(403, 'Access denied. You are not an admin or credentials do not match.');
    }
  } else {
    throw new AppError(400, 'Either password, OTP, or 2FA token is required');
  }

  // ─── Issue final session tokens ───
  const userIdStr = user._id.toString();
  const accessToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtAccessSecret, {
    expiresIn: config.accessTokenExpires as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtRefreshSecret, {
    expiresIn: config.refreshTokenExpires as jwt.SignOptions['expiresIn'],
  });

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await updateUserRefreshToken(userIdStr, hashedRefreshToken);

  const { password: _, refreshToken: __, ...sanitizedUser } = user.toObject();

  setRefreshTokenCookie(res, refreshToken);
  successResponse(res, { accessToken, refreshToken, user: sanitizedUser }, 'Admin login successful');
});

// Development endpoint - bypass OTP for testing
export const adminLoginDev = asyncHandler(async (req: Request, res: Response) => {
  if (config.env !== 'development') {
    throw new AppError(403, 'Dev endpoint only available in development mode');
  }

  const { phone } = req.body;
  if (!phone) {
    throw new AppError(400, 'Phone is required');
  }

  const normalizedPhone = normalizePhone(phone);
  const last10 = normalizedPhone.slice(-10);
  const phoneRegex = new RegExp(`${last10}$`);

  const user = await UserModel.findOne({
    phone: { $regex: phoneRegex },
    role: { $in: [ROLE.ADMIN, ROLE.SUPERADMIN] },
  });

  if (!user) {
    throw new AppError(404, 'Admin user not found with this phone number');
  }

  const userIdStr = user._id.toString();
  const accessToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtAccessSecret, {
    expiresIn: config.accessTokenExpires as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtRefreshSecret, {
    expiresIn: config.refreshTokenExpires as jwt.SignOptions['expiresIn'],
  });

  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await updateUserRefreshToken(userIdStr, hashedRefreshToken);

  setRefreshTokenCookie(res, refreshToken);
  successResponse(res, { accessToken, refreshToken, user }, 'Admin login successful (dev mode)');
});

export const deleteUserByAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await UserModel.findByIdAndDelete(id);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  successResponse(res, null, 'User deleted successfully');
});

export const updateUserByAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await UserModel.findByIdAndUpdate(
    id,
    req.body,
    { new: true }
  );

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  successResponse(res, { user }, 'User updated');
});

export const getEnquiries = asyncHandler(async (_req: Request, res: Response) => {
  const enquiries = await listAllEnquiries();
  successResponse(res, enquiries, 'Enquiries retrieved');
});

export const updateEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const { status, isRead } = req.body;
  const update: { status?: string; isRead?: boolean } = {};

  if (status !== undefined) update.status = status;
  if (isRead !== undefined) update.isRead = Boolean(isRead);

  if (Object.keys(update).length === 0) {
    throw new AppError(400, 'Nothing to update.');
  }

  const enquiry = await adminUpdateEnquiry(req.params.id, update);
  successResponse(res, enquiry, 'Enquiry updated');
});

export const createUserByAdmin = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUserWithRole(req.body);
  successResponse(res, user, 'User created and role assigned', 201);
});

export const changeUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { userId, role } = req.body;
  const user = await adminUpdateUserRole(userId, role);
  successResponse(res, user, 'User role updated successfully');
});

export const adminLogout = asyncHandler(async (req: Request, res: Response) => {
  const refreshTokenValue = req.cookies.refreshToken;
  if (!refreshTokenValue) {
    clearRefreshTokenCookie(res);
    successResponse(res, null, 'Already logged out');
    return;
  }
  const result = await logoutUser(refreshTokenValue, res, ['admin', 'superadmin']);
  if (result) {
    successResponse(res, null, 'Admin logged out successfully');
  } else {
    throw new AppError(403, 'Invalid admin logout context');
  }
});

export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const dashboard = await getDashboardData();
  successResponse(res, dashboard, 'Admin dashboard data');
});

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await listUsers();
  successResponse(res, users, 'Users retrieved');
});

export const getAllOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await listAllOrders();
  successResponse(res, orders, 'All orders retrieved');
});

export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await adminUpdateOrder(req.params.id, req.body);
  successResponse(res, order, 'Order updated');
});

export const adminForgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, identifier } = req.body;
  const target = (email || identifier || '').trim();
  if (!target) {
    throw new AppError(400, 'Email, mobile or staff ID is required');
  }

  let user: any;
  if (target.includes('@')) {
    user = await findUserByEmail(target);
  } else {
    user = await findUserByPhone(target);
  }

  if (!user || ![ROLE.ADMIN, ROLE.SUPERADMIN].includes(user.role as any)) {
    throw new AppError(404, 'No staff account found with this email, mobile number or staff ID.');
  }

  const resetToken = jwt.sign(
    { id: user._id.toString(), type: 'password_reset' },
    config.jwtAccessSecret,
    { expiresIn: '15m' }
  );

  successResponse(res, { success: true, resetToken, email: user.email, name: user.name }, 'Password reset instructions generated');
});

export const adminResetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    throw new AppError(400, 'Token and new password are required');
  }

  let decoded: { id: string; type: string };
  try {
    decoded = jwt.verify(token, config.jwtAccessSecret) as { id: string; type: string };
  } catch {
    throw new AppError(401, 'Invalid or expired reset token');
  }

  if (decoded.type !== 'password_reset') {
    throw new AppError(401, 'Invalid token type');
  }

  const user = await UserModel.findById(decoded.id).select('+password');
  if (!user || ![ROLE.ADMIN, ROLE.SUPERADMIN].includes(user.role as any)) {
    throw new AppError(404, 'Admin not found');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  successResponse(res, { success: true }, 'Password reset successfully');
});

