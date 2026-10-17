import { AppError } from '../utils/app-error';
import { getAllUsers } from '../repositories/user.repository';
import { countProducts } from '../repositories/product.repository';
import { updateOrderById } from '../repositories/order.repository';
import { cancelOrder, markOrderPaymentFailed } from './order.service';
import { ReviewModel } from '../models/review.model';
import { OrderModel } from '../models/order.model';
import { UserModel } from '../models/user.model';
import { findAllEnquiries, updateEnquiryById, deleteEnquiryById as deleteEnquiryByIdRepo } from '../repositories/enquiry.repository';
import { toObjectId } from './order.service';

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

export const listAllOrdersAdmin = async (params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
}) => {
  const { page, limit, search, status, paymentStatus } = params;
  const skip = (page - 1) * limit;

  const filter: any = {};
  
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { '_id': searchRegex },
      { 'user.name': searchRegex },
      { 'user.email': searchRegex },
    ];
  }
  
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const [orders, total] = await Promise.all([
    OrderModel.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments(filter),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const dispatchOrder = async (
  orderId: string,
  payload: { trackingNumber: string; courierPartner: string; dispatchedAt?: Date }
) => {
  const order = await OrderModel.findByIdAndUpdate(
    toObjectId(orderId),
    {
      $set: {
        trackingNumber: payload.trackingNumber,
        courierPartner: payload.courierPartner,
        dispatchedAt: payload.dispatchedAt || new Date(),
        orderStatus: 'shipped',
      },
    },
    { new: true, runValidators: true }
  ).populate('user', 'name email phone');

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  return order;
};

export const adminUpdateOrder = async (orderId: string, payload: { orderStatus?: string; paymentStatus?: string }) => {
  // Cancelling or payment failure releases reserved stock (atomically, once).
  if (payload.orderStatus === 'cancelled') {
    return cancelOrder(orderId);
  }
  if (payload.paymentStatus === 'failed') {
    return markOrderPaymentFailed(orderId);
  }

  const updatePayload: { orderStatus?: string; paymentStatus?: string } = {};
  if (payload.orderStatus) updatePayload.orderStatus = payload.orderStatus;
  if (payload.paymentStatus) updatePayload.paymentStatus = payload.paymentStatus;

  const order = await updateOrderById(orderId, updatePayload as any);
  if (!order) {
    throw new AppError(404, 'Order not found');
  }
  return order;
};

export const adminUpdateUserRole = async (userId: string, role: string) => {
  const user = await UserModel.findByIdAndUpdate(userId, { role }, { new: true, runValidators: true });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
};

export const listAllEnquiries = async () => findAllEnquiries();

export const adminUpdateEnquiry = async (
  enquiryId: string,
  update: { status?: string; isRead?: boolean; notes?: string }
) => {
  const enquiry = await updateEnquiryById(enquiryId, update as any);
  if (!enquiry) {
    throw new AppError(404, 'Enquiry not found');
  }
  return enquiry;
};

export const deleteEnquiryById = async (enquiryId: string) => deleteEnquiryByIdRepo(enquiryId);
