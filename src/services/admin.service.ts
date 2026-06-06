import { getAllUsers } from '../repositories/user.repository.ts';
import { countProducts } from '../repositories/product.repository.ts';
import { updateOrderById } from '../repositories/order.repository.ts';
import { ReviewModel } from '../models/review.model.ts';
import { OrderModel } from '../models/order.model.ts';
import { UserModel } from '../models/user.model.ts';

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

export const listAllOrders = async () => {
  return OrderModel.find().populate('user', 'name email').sort({ createdAt: -1 });
};

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

export const adminUpdateUserRole = async (userId: string, role: string) => {
  const user = await UserModel.findByIdAndUpdate(userId, { role }, { new: true, runValidators: true });
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return user;
};
