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
import { successResponse, errorResponse } from '../utils/api-response';
import { updateUserRefreshToken } from '../repositories/user.repository';

// Phone normalize helper
const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      errorResponse(res, 'Phone and OTP are required', 400);
      return;
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
      errorResponse(res, 'Access denied. You are not an admin or credentials do not match.', 403);
      return;
    }

    const userIdStr = user._id.toString();
    const accessToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtAccessSecret, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtRefreshSecret, { expiresIn: '7d' });

    // ✅ FIX: refreshToken ko DB mein save karo (bcrypt hash)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await updateUserRefreshToken(userIdStr, hashedRefreshToken);

    setRefreshTokenCookie(res, refreshToken);
    successResponse(res, { user, accessToken }, 'Admin login successful');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

// Development endpoint - bypass OTP for testing
export const adminLoginDev = async (req: Request, res: Response): Promise<void> => {
  try {
    if (config.env !== 'development') {
      errorResponse(res, 'Dev endpoint only available in development mode', 403);
      return;
    }

    const { phone } = req.body;
    if (!phone) {
      errorResponse(res, 'Phone is required', 400);
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    const last10 = normalizedPhone.slice(-10);
    const phoneRegex = new RegExp(`${last10}$`);
    
    const user = await UserModel.findOne({
      phone: { $regex: phoneRegex },
      role: { $in: [ROLE.ADMIN, ROLE.SUPERADMIN] },
    });
    
    if (!user) {
      errorResponse(res, 'Admin user not found with this phone number', 404);
      return;
    }

    const userIdStr = user._id.toString();
    const accessToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtAccessSecret, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtRefreshSecret, { expiresIn: '7d' });

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await updateUserRefreshToken(userIdStr, hashedRefreshToken);

    setRefreshTokenCookie(res, refreshToken);
    successResponse(res, { user, accessToken }, 'Admin login successful (dev mode)');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
export const deleteUserByAdmin = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

  const user = await UserModel.findByIdAndDelete(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
};
export const updateUserByAdmin = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

  const user = await UserModel.findByIdAndUpdate(
    id,
    req.body,
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.json({
    success: true,
    user,
  });
};
export const getEnquiries = async (_req: Request, res: Response): Promise<void> => {
  try {
    const enquiries = await listAllEnquiries();
    successResponse(res, enquiries, 'Enquiries retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const updateEnquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const enquiry = await adminUpdateEnquiryStatus(req.params.id, status);
    successResponse(res, enquiry, 'Enquiry status updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const createUserByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await registerUserWithRole(req.body);
    successResponse(res, user, 'User created and role assigned', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const changeUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.body;
    const user = await adminUpdateUserRole(userId, role);
    successResponse(res, user, 'User role updated successfully');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const adminLogout = async (req: Request, res: Response): Promise<void> => {
  try {
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
      errorResponse(res, 'Invalid admin logout context', 403);
    }
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  try {
    const dashboard = await getDashboardData();
    successResponse(res, dashboard, 'Admin dashboard data');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await listUsers();
    successResponse(res, users, 'Users retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const getAllOrders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const orders = await listAllOrders();
    successResponse(res, orders, 'All orders retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await adminUpdateOrder(req.params.id, req.body);
    successResponse(res, order, 'Order updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
