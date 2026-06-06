import { CartModel, ICart } from '../models/cart.model.js';
import { Types } from 'mongoose';

export const getCartByUser = async (userId: string | Types.ObjectId): Promise<ICart | null> => {
  return CartModel.findOne({ user: userId }).populate('items.product');
};

export const createCartForUser = async (userId: string | Types.ObjectId): Promise<ICart> => {
  return CartModel.create({ user: userId, items: [], totalAmount: 0 });
};

export const upsertCart = async (userId: string | Types.ObjectId, cartData: Partial<ICart>) => {
  return CartModel.findOneAndUpdate({ user: userId }, cartData, { new: true, upsert: true, runValidators: true });
};
