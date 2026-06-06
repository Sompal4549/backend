import { Types } from 'mongoose';
import { OrderModel, IOrder } from '../models/order.model.js';

export const createOrder = async (payload: Partial<IOrder>): Promise<IOrder> => {
  return OrderModel.create(payload);
};

export const getOrdersByUser = async (userId: string | Types.ObjectId) => {
  return OrderModel.find({ user: userId }).populate('items.product').sort({ createdAt: -1 });
};

export const getOrderById = async (id: string) => {
  return OrderModel.findById(id).populate('user').populate('items.product');
};

export const updateOrderById = async (id: string, payload: Partial<IOrder>) => {
  return OrderModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
};
