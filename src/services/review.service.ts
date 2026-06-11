import { 
  createReview, 
  findReviewByUserAndProduct, 
  getReviewById, 
  updateReviewById, 
  deleteReviewById, 
  calculateProductRating,
  getReviewsForProduct 
} from '../repositories/review.repository';
import { updateProductById } from '../repositories/product.repository';
import { IReview } from '../models/review.model';
import { Types } from 'mongoose';

export const addReview = async (userId: string, productId: string, payload: Partial<IReview>) => {
  const existing = await findReviewByUserAndProduct(userId, productId);
  if (existing) {
    const error = new Error('You have already reviewed this product');
    (error as any).statusCode = 409;
    throw error;
  }
  const review = await createReview({ user: new Types.ObjectId(userId), product: new Types.ObjectId(productId), ...payload });
  await recalculateRating(productId);
  return review;
};

export const editReview = async (userId: string, reviewId: string, payload: Partial<IReview>) => {
  const review = await getReviewById(reviewId);
  if (!review || review.user.toString() !== userId) {
    const error = new Error('Review not found or unauthorized');
    (error as any).statusCode = 404;
    throw error;
  }
  const updated = await updateReviewById(reviewId, payload);
  await recalculateRating(review.product.toString());
  return updated;
};

export const removeReview = async (userId: string, reviewId: string) => {
  const review = await getReviewById(reviewId);
  if (!review || review.user.toString() !== userId) {
    const error = new Error('Review not found or unauthorized');
    (error as any).statusCode = 404;
    throw error;
  }
  await deleteReviewById(reviewId);
  await recalculateRating(review.product.toString());
  return review;
};

export const getProductReviews = async (productId: string) => {
  const reviews = await getReviewsForProduct(productId) || [];
  const ratingStats = await calculateProductRating(productId);
  const averageRating = ratingStats?.[0]?.averageRating || 0;

  const formattedReviews = reviews.map((rev: any) => ({
    _id: rev._id.toString(),
    user: rev.user?.name || 'Anonymous',
    userId: rev.user?._id?.toString() || rev.user?.toString() || '',
    rating: rev.rating,
    comment: rev.comment || '',
    createdAt: rev.createdAt,
  }));

  return {
    rating: averageRating,
    averageRating: averageRating,
    reviews: formattedReviews,
    userReviews: reviews.map((rev: any) => ({
      userName: rev.user?.name || 'Anonymous',
      rating: rev.rating,
      reviewDescription: rev.comment || rev.description || "",
    })),
  };
};

const recalculateRating = async (productId: string) => {
  const result = await calculateProductRating(productId);
  const averageRating = result?.[0]?.averageRating || 0;
  await updateProductById(productId, { averageRating });
};
