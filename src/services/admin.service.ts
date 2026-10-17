import { AppError } from '../utils/app-error';
import { getAllUsers } from '../repositories/user.repository';
import { countProducts } from '../repositories/product.repository';
import { updateOrderById } from '../repositories/order.repository';
import { cancelOrder, markOrderPaymentFailed } from './order.service';
import { ReviewModel } from '../models/review.model';
import { OrderModel } from '../models/order.model';
import { UserModel } from '../models/user.model';
import { LeadModel } from '../models/lead.model';
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

  const filter: Record<string, unknown> = {};

  const term = search?.trim();
  if (term) {
    // Escaped so typed text can never act as a regex pattern
    const searchRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    // Orders reference the customer (Lead) by id, so match customers first
    const customers = await LeadModel.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { companyName: searchRegex },
      ],
    })
      .select('_id')
      .limit(500)
      .lean();
    const or: Record<string, unknown>[] = [
      { user: { $in: customers.map((c) => c._id) } },
      { 'shippingAddress.phone': searchRegex },
      { 'shippingAddress.city': searchRegex },
      { trackingNumber: searchRegex },
      { razorpayOrderId: searchRegex },
    ];
    if (/^[a-f0-9]{24}$/i.test(term)) or.push({ _id: term });
    filter.$or = or;
  }

  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  const [orders, total, statusCounts, revenue, paymentCounts] = await Promise.all([
    OrderModel.find(filter)
      .populate('user', 'firstName lastName email phone phoneCode companyName')
      .populate('items.product', 'title slug images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments(filter),
    // Summary cards cover every order, independent of the current filters
    OrderModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
    OrderModel.aggregate<{ total: number; count: number }>([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    OrderModel.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }]),
  ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    summary: {
      total: statusCounts.reduce((sum, s) => sum + s.count, 0),
      byStatus,
      byPayment: Object.fromEntries(paymentCounts.map((p) => [p._id, p.count])),
      paidRevenue: revenue[0]?.total || 0,
      paidOrders: revenue[0]?.count || 0,
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
  ).populate('user', 'firstName lastName email phone phoneCode companyName');

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
