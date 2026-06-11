import { Response } from 'express';
import { placeOrder, fetchUserOrders, fetchOrder } from '../services/order.service';
import { listAllOrders } from '../services/admin.service';
import { ROLE } from '../constants/roles.constants';
import { successResponse, errorResponse } from '../utils/api-response';
import { AuthRequest } from '../middlewares/auth.middleware';
import { updateOrderById } from '../repositories/order.repository';
import { sendWhatsAppMessage } from '../utils/whatsapp';

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
    const role = req.user?.role;
    if (role === ROLE.ADMIN || role === ROLE.SUPERADMIN) {
      const orders = await listAllOrders();
      console.info('getMyOrders: admin fetched orders count', Array.isArray(orders) ? orders.length : 0);
      successResponse(res, orders, 'All orders retrieved');
      return;
    }

    const orders = await fetchUserOrders(req.user!.id);
    console.info('getMyOrders: fetched orders count', Array.isArray(orders) ? orders.length : 0);
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

export const updateOrderByUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const { orderStatus } = req.body as { orderStatus?: string };

    // Only allow limited status changes from users (e.g., cancel)
    const allowed = ['cancelled'];
    if (!orderStatus || !allowed.includes(orderStatus)) {
      errorResponse(res, 'Invalid or unsupported order status update', 400);
      return;
    }

    // Ensure order exists and belongs to user
    const order = await fetchOrder(req.user!.id, orderId);

    // Basic business rule: only allow cancelling if not already shipped/delivered/cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      errorResponse(res, `Order cannot be cancelled from status '${order.orderStatus}'`, 400);
      return;
    }

    const updated = await updateOrderById(orderId, { orderStatus } as any);
    if (!updated) {
      errorResponse(res, 'Order not found', 404);
      return;
    }

    // Notify the phone number present on the shipping address
    const phone = (updated.shippingAddress as any)?.phone || (order.shippingAddress as any)?.phone;
    if (phone) {
      const message = `*Order Update!*\n\nYour order #${updated._id} status has been updated to: ${updated.orderStatus}.`;
      try {
        await sendWhatsAppMessage(String(phone), message, (req.user as any)?.name || null);
      } catch (err) {
        console.error('Failed to send WhatsApp on user update:', (err as Error).message);
      }
    }

    successResponse(res, updated, 'Order updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
