import { Request, Response } from 'express';
import { getDashboardData, listUsers, listAllOrders, adminUpdateOrder, adminUpdateUserRole } from '../services/admin.service';
import { loginAdmin, logoutUser, registerUserWithRole } from '../services/auth.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../helpers/cookie.helper';
import { successResponse, errorResponse } from '../utils/api-response';

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await loginAdmin(email, password);
    setRefreshTokenCookie(res, refreshToken);
    successResponse(res, { user, accessToken }, 'Admin login successful');
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
