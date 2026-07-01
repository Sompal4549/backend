import { 
  createReview,
  findReviewByUserAndProduct,
  getReviewById,
  updateReviewById,
  deleteReviewById,
  calculateProductRating,
  getReviewsForProduct,
  getPaginatedReviewsForProduct,
  countReviewsForProduct
} from '../repositories/review.repository';
import { updateProductById } from '../repositories/product.repository';
import { IReview } from '../models/review.model';
import { Types } from 'mongoose';
import { UserModel } from '../models/user.model';

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

export const addReviewForCustomer = async (productId: string, customerId: string, payload: Partial<IReview>) => {
  const customer = await UserModel.findById(customerId);
  if (!customer) {
    const error = new Error('Target customer not found');
    (error as any).statusCode = 404;
    throw error;
  }

  const existing = await findReviewByUserAndProduct(customerId, productId);
  if (existing) {
    const error = new Error('This customer has already reviewed the product');
    (error as any).statusCode = 409;
    throw error;
  }

  const { userId, ...reviewPayload } = payload as any;
  const review = await createReview({ user: new Types.ObjectId(customerId), product: new Types.ObjectId(productId), ...reviewPayload });
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

export const getProductReviews = async (
  productId: string,
  page?: number,
  limit?: number,
  rating?: number
) => {
  // Determine whether to paginate
  let reviews;
  let totalCount = undefined;
  if (page && limit) {
    // Use paginated query
    const pg = Math.max(page, 1);
    const lt = Math.max(limit, 1);
    reviews = await getPaginatedReviewsForProduct(productId, pg, lt, rating);
    // Get total count for pagination metadata
    totalCount = await countReviewsForProduct(productId, rating);
  } else {
    // Fallback to existing behavior (no pagination)
    reviews = await getReviewsForProduct(productId) || [];
  }

  const ratingStats = await calculateProductRating(productId);
  const averageRating = ratingStats?.[0]?.averageRating || 0;

  const formattedReviews = (reviews || []).map((rev: any) => ({
    _id: rev._id.toString(),
    user: rev.user?.name || 'Anonymous',
    userId: rev.user?._id?.toString() || rev.user?.toString() || '',
    rating: rev.rating,
    comment: rev.comment || '',
    createdAt: rev.createdAt,
  }));

  const result: any = {
    rating: averageRating,
    averageRating: averageRating,
    reviews: formattedReviews,
    userReviews: (reviews || []).map((rev: any) => ({
      userName: rev.user?.name || 'Anonymous',
      rating: rev.rating,
      reviewDescription: rev.comment || rev.description || "",
    })),
  };

  // Include pagination metadata if applicable
  if (totalCount !== undefined) {
    result.pagination = {
      page: page,
      limit: limit,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / (limit as number)),
    };
  }
  return result;
};

const recalculateRating = async (productId: string) => {
  const result = await calculateProductRating(productId);
  const averageRating = result?.[0]?.averageRating || 0;
  await updateProductById(productId, { averageRating });
};
