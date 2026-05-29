import { Response } from 'express';
import { placeOrder, fetchUserOrders, fetchOrder } from '../services/order.service.js';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await placeOrder(req.user!.id, req.body);
    successResponse(res, order, 'Order created', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await fetchUserOrders(req.user!.id);
    successResponse(res, orders, 'User orders retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await fetchOrder(req.user!.id, req.params.id);
    successResponse(res, order, 'Order retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
