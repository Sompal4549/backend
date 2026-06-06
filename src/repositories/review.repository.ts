import { ReviewModel, IReview } from '../models/review.model.ts';
import { Types } from 'mongoose';

export const createReview = async (payload: Partial<IReview>): Promise<IReview> => {
  return ReviewModel.create(payload);
};

export const findReviewByUserAndProduct = async (userId: string, productId: string) => {
  return ReviewModel.findOne({ user: userId, product: productId });
};

export const getReviewById = async (id: string) => {
  return ReviewModel.findById(id);
};

export const updateReviewById = async (id: string, payload: Partial<IReview>) => {
  return ReviewModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
};

export const deleteReviewById = async (id: string) => {
  return ReviewModel.findByIdAndDelete(id);
};

export const getReviewsForProduct = async (productId: string) => {
  return ReviewModel.find({ product: productId }).populate('user');
};

export const calculateProductRating = async (productId: string) => {
  return ReviewModel.aggregate([
    { $match: { product: new Types.ObjectId(productId) } },
    { $group: { _id: '$product', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
};
