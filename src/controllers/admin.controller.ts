import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { ROLE } from '../constants/roles.constants';
import { verifyWhatsAppOtp } from '../services/otp.service';
import { config } from '../config/app.config';
import { getDashboardData, listUsers, listAllOrders, adminUpdateOrder, adminUpdateUserRole, listAllEnquiries, adminUpdateEnquiryStatus } from '../services/admin.service';
import { logoutUser, registerUserWithRole } from '../services/auth.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helper';
import { successResponse, errorResponse } from '../utils/api-response';

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      errorResponse(res, 'Phone and OTP are required', 400);
      return;
    }

    // Verify OTP specifically for admin login purpose
    await verifyWhatsAppOtp(phone, otp, 'admin-login');

    const user = await UserModel.findOne({ phone, role: { $in: [ROLE.ADMIN, ROLE.SUPERADMIN] } });
    if (!user) {
      errorResponse(res, 'Access denied. You are not an admin or credentials do not match.', 403);
      return;
    }

    // Ensure payload uses 'userId' and proper secrets for access vs refresh
    const userIdStr = user._id.toString();
    const accessToken = jwt.sign({ userId: userIdStr, role: user.role }, config.jwtAccessSecret, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ userId: userIdStr }, config.jwtRefreshSecret, { expiresIn: '7d' });

    setRefreshTokenCookie(res, refreshToken);
    successResponse(res, { user, accessToken }, 'Admin login successful');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
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
