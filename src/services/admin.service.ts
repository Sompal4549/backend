import { getAllUsers } from '../repositories/user.repository.js';
import { countProducts } from '../repositories/product.repository.js';
import { updateOrderById } from '../repositories/order.repository.js';
import { ReviewModel } from '../models/review.model.js';
import { OrderModel } from '../models/order.model.js';

export const getDashboardData = async () => {
  const totalUsers = await getAllUsers();
  const totalProducts = await countProducts({});
  const totalOrders = await OrderModel.countDocuments();
  const totalReviews = await ReviewModel.countDocuments();
  return {
    totalUsers: totalUsers.length,
    totalProducts,
    totalOrders,
    totalReviews,
  };
};

export const listUsers = async () => getAllUsers();

export const adminUpdateOrder = async (orderId: string, payload: { orderStatus?: string; paymentStatus?: string }) => {
  const updatePayload: { orderStatus?: string; paymentStatus?: string } = {};
  if (payload.orderStatus) updatePayload.orderStatus = payload.orderStatus;
  if (payload.paymentStatus) updatePayload.paymentStatus = payload.paymentStatus;

  const order = await updateOrderById(orderId, updatePayload as any);
  if (!order) {
    const error = new Error('Order not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return order;
};
