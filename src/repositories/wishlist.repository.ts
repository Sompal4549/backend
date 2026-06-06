import { WishlistModel, IWishlist } from '../models/wishlist.model.ts';
import { Types } from 'mongoose';

export const getWishlistByUser = async (userId: string | Types.ObjectId): Promise<IWishlist | null> => {
  return WishlistModel.findOne({ user: userId }).populate('products');
};

export const createWishlist = async (userId: string | Types.ObjectId): Promise<IWishlist> => {
  return WishlistModel.create({ user: userId, products: [] });
};

export const addProductToWishlist = async (userId: string | Types.ObjectId, productId: string | Types.ObjectId) => {
  return WishlistModel.findOneAndUpdate(
    { user: userId },
    { $addToSet: { products: productId } },
    { new: true, upsert: true }
  ).populate('products');
};

export const removeProductFromWishlist = async (userId: string | Types.ObjectId, productId: string | Types.ObjectId) => {
  return WishlistModel.findOneAndUpdate(
    { user: userId },
    { $pull: { products: productId } },
    { new: true }
  ).populate('products');
};
