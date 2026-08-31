import { Types, ClientSession } from 'mongoose';
import { OrderModel, IOrder } from '../models/order.model';

export const createOrder = async (payload: Partial<IOrder>, session?: ClientSession | null): Promise<IOrder> => {
  const order = new OrderModel(payload);
  if (session) {
    return order.save({ session });
  }
  return order.save();
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

export const getOrdersByLead = async (leadId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const query = { user: new Types.ObjectId(leadId) };
  const [orders, total] = await Promise.all([
    OrderModel.find(query)
      .populate('items.product', 'title slug images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    OrderModel.countDocuments(query),
  ]);
  return { orders, total, page, limit };
};
