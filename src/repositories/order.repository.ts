import { Types } from 'mongoose';
import { OrderModel, IOrder } from '../models/order.model';

export const createOrder = async (payload: Partial<IOrder>): Promise<IOrder> => {
  return OrderModel.create(payload);
};

export const getOrdersByUser = async (userId: string | Types.ObjectId) => {
  // Support both ObjectId and string-stored user references.
  const idStr = String(userId);
  const maybeObjectId = Types.ObjectId.isValid(idStr) ? new Types.ObjectId(idStr) : null;
  const query = maybeObjectId ? { $or: [{ user: maybeObjectId }, { user: idStr }] } : { user: idStr };
  return OrderModel.find(query).populate('items.product').sort({ createdAt: -1 });
};

export const getOrderById = async (id: string) => {
  return OrderModel.findById(id).populate('user').populate('items.product');
};

export const updateOrderById = async (id: string, payload: Partial<IOrder>) => {
  return OrderModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
};
