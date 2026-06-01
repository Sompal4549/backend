import { Request, Response } from 'express';
import { getDashboardData, listUsers, adminUpdateOrder } from '../services/admin.service';
import { loginAdmin, logoutUser } from '../services/auth.service';
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

export const adminLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshTokenValue = req.cookies.refreshToken;
    if (!refreshTokenValue) {
      clearRefreshTokenCookie(res);
      successResponse(res, null, 'Already logged out');
      return;
    }
    await logoutUser(refreshTokenValue, res);
    successResponse(res, null, 'Admin logged out successfully');
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

export const updateOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await adminUpdateOrder(req.params.id, req.body);
    successResponse(res, order, 'Order updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
