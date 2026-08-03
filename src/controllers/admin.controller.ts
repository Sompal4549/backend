import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';
import { verifyWhatsAppOtp } from '../services/otp.service';
import { config } from '../config/app.config';
import { getDashboardData, listUsers, listAllOrders, adminUpdateOrder, adminUpdateUserRole, listAllEnquiries, adminUpdateEnquiryStatus } from '../services/admin.service';
import { logoutUser, registerUserWithRole } from '../services/auth.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helper';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { updateUserRefreshToken } from '../repositories/user.repository';

// Phone normalize helper
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    throw new AppError(400, 'Phone and OTP are required');
  }

  // ✅ FIX: Phone normalize karo
  const normalizedPhone = normalizePhone(phone);

  // Verify OTP specifically for admin login purpose (normalized phone)
  await verifyWhatsAppOtp(normalizedPhone, otp, 'admin-login');

  // DB mein phone kisi bhi format mein ho sakta hai — last 10 digits se match
  const last10 = normalizedPhone.slice(-10);
  const phoneRegex = new RegExp(`${last10}$`);
  const user = await UserModel.findOne({
    phone: { $regex: phoneRegex },
    role: { $in: [ROLE.ADMIN, ROLE.SUPERADMIN] },
  });
  if (!user) {
    throw new AppError(403, 'Access denied. You are not an admin or credentials do not match.');
  }

  const userIdStr = user._id.toString();
  const accessToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtAccessSecret, {
    expiresIn: config.accessTokenExpires as jwt.SignOptions['expiresIn'],
  });
  const refreshToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtRefreshSecret, {
    expiresIn: config.refreshTokenExpires as jwt.SignOptions['expiresIn'],
  });

  // ✅ FIX: refreshToken ko DB mein save karo (bcrypt hash)
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await updateUserRefreshToken(userIdStr, hashedRefreshToken);

  setRefreshTokenCookie(res, refreshToken);
  successResponse(res, { user, accessToken }, 'Admin login successful');
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
  successResponse(res, { user, accessToken }, 'Admin login successful (dev mode)');
});

export const deleteUserByAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await UserModel.findByIdAndDelete(id);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
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

  res.json({
    success: true,
    user,
  });
});

export const getEnquiries = asyncHandler(async (_req: Request, res: Response) => {
  const enquiries = await listAllEnquiries();
  successResponse(res, enquiries, 'Enquiries retrieved');
});

export const updateEnquiry = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  const enquiry = await adminUpdateEnquiryStatus(req.params.id, status);
  successResponse(res, enquiry, 'Enquiry status updated');
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
