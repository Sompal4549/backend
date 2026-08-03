import { Response } from 'express';
import { placeOrder, fetchUserOrders, fetchOrder } from '../services/order.service';
import { listAllOrders, adminUpdateOrder } from '../services/admin.service';
import { ROLE } from '../constants/roles.constants';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { AuthRequest } from '../middlewares/auth.middleware';
import { updateOrderById, getOrderById as getOrderByIdRepo } from '../repositories/order.repository';
import { sendWhatsAppMessage } from '../utils/whatsapp';

export const createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const order = await placeOrder(req.user!.id, req.body);
  successResponse(res, order, 'Order created', 201);
});

export const getMyOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const role = req.user?.role;
  if (role === ROLE.ADMIN || role === ROLE.SUPERADMIN) {
    const orders = await listAllOrders();
    successResponse(res, orders, 'All orders retrieved');
    return;
  }

  const orders = await fetchUserOrders(req.user!.id);
  successResponse(res, orders, 'User orders retrieved');
});

export const getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const role = req.user?.role;
  if (role === ROLE.ADMIN || role === ROLE.SUPERADMIN) {
    const order = await getOrderByIdRepo(req.params.id);
    if (!order) {
      throw new AppError(404, 'Order not found');
    }
    successResponse(res, order, 'Order retrieved');
    return;
  }
  const order = await fetchOrder(req.user!.id, req.params.id);
  successResponse(res, order, 'Order retrieved');
});

export const updateOrderByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id;
  const { orderStatus, paymentStatus } = req.body as { orderStatus?: string; paymentStatus?: string };
  const role = req.user?.role;
  const isAdmin = role === ROLE.ADMIN || role === ROLE.SUPERADMIN;

  if (!isAdmin) {
    // Users may only cancel their own order.
    if (orderStatus !== 'cancelled' || paymentStatus) {
      throw new AppError(400, 'Invalid or unsupported order status update');
    }

    // Ensure order exists and belongs to user
    const order = await fetchOrder(req.user!.id, orderId);

    // Basic business rule: only allow cancelling if not already shipped/delivered/cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      throw new AppError(400, `Order cannot be cancelled from status '${order.orderStatus}'`);
    }

    const updated = await updateOrderById(orderId, { orderStatus } as any);
    if (!updated) {
      throw new AppError(404, 'Order not found');
    }

    // Notify the phone number present on the shipping address
    const phone = (updated.shippingAddress as any)?.phone || (order.shippingAddress as any)?.phone;
    if (phone) {
      const message = `*Order Update!*\n\nYour order #${updated._id} status has been updated to: ${updated.orderStatus}.`;
      sendWhatsAppMessage(String(phone), message, (req.user as any)?.name || null).catch((err) =>
        console.error('Failed to send WhatsApp on user update:', (err as Error).message)
      );
    }

    successResponse(res, updated, 'Order updated');
    return;
  }

  const updated = await adminUpdateOrder(orderId, { orderStatus, paymentStatus });
  successResponse(res, updated, 'Order updated');
});
