import { ReviewModel, IReview } from '../models/review.model';
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

// New function: fetch paginated reviews with optional rating filter
export const getPaginatedReviewsForProduct = async (
  productId: string,
  page: number = 1,
  limit: number = 50,
  rating?: number
) => {
  const query: any = { product: productId };
  if (rating !== undefined) {
    query.rating = rating;
  }
  const skip = (page - 1) * limit;
  return ReviewModel.find(query)
    .populate('user')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Count total reviews for a product (optional rating filter)
export const countReviewsForProduct = async (productId: string, rating?: number) => {
  const query: any = { product: productId };
  if (rating !== undefined) {
    query.rating = rating;
  }
  return ReviewModel.countDocuments(query);
};

// Admin moderation functions
export const getAllReviewsPaginated = async (
  page: number = 1,
  limit: number = 20,
  filters: { status?: string; rating?: number; productId?: string; search?: string } = {}
) => {
  const query: any = {};
  
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  
  if (filters.rating) {
    query.rating = filters.rating;
  }
  
  if (filters.productId) {
    query.product = filters.productId;
  }

  if (filters.search) {
    query.$or = [
      { comment: { $regex: filters.search, $options: 'i' } },
      { title: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  
  const [reviews, totalCount] = await Promise.all([
    ReviewModel.find(query)
      .populate('user', 'name email phone')
      .populate('product', 'title code images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ReviewModel.countDocuments(query),
  ]);

  return {
    reviews,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
  };
};

export const updateReviewStatus = async (
  reviewId: string,
  status: 'approved' | 'rejected',
  moderatorId: string
) => {
  const review = await ReviewModel.findByIdAndUpdate(
    reviewId,
    {
      status,
      moderatedAt: new Date(),
      moderatedBy: new Types.ObjectId(moderatorId),
    },
    { new: true, runValidators: true }
  ).populate('user', 'name email').populate('product', 'title code');

  if (review && status === 'approved') {
    // Recalculate product rating when approved
    const result = await calculateProductRating(review.product.toString());
    const averageRating = result?.[0]?.averageRating || 0;
    const { updateProductById } = await import('../repositories/product.repository');
    await updateProductById(review.product.toString(), { averageRating });
  }

  return review;
};

export const bulkUpdateReviewStatus = async (
  reviewIds: string[],
  status: 'approved' | 'rejected',
  moderatorId: string
) => {
  const result = await ReviewModel.updateMany(
    { _id: { $in: reviewIds.map(id => new Types.ObjectId(id)) } },
    {
      $set: {
        status,
        moderatedAt: new Date(),
        moderatedBy: new Types.ObjectId(moderatorId),
      },
    }
  );

  // If approved, recalculate ratings for affected products
  if (status === 'approved') {
    const reviews = await ReviewModel.find({ _id: { $in: reviewIds.map(id => new Types.ObjectId(id)) } });
    const productIds = [...new Set(reviews.map(r => r.product.toString()))];
    
    for (const productId of productIds) {
      const result = await calculateProductRating(productId);
      const averageRating = result?.[0]?.averageRating || 0;
      const { updateProductById } = await import('../repositories/product.repository');
      await updateProductById(productId, { averageRating });
    }
  }

  return result;
};

export const bulkDeleteReviews = async (reviewIds: string[]) => {
  const result = await ReviewModel.deleteMany({
    _id: { $in: reviewIds.map(id => new Types.ObjectId(id)) },
  });

  // Recalculate ratings for affected products
  const reviews = await ReviewModel.find({ _id: { $in: reviewIds.map(id => new Types.ObjectId(id)) } });
  const productIds = [...new Set(reviews.map(r => r.product.toString()))];
  
  for (const productId of productIds) {
    const result = await calculateProductRating(productId);
    const averageRating = result?.[0]?.averageRating || 0;
    const { updateProductById } = await import('../repositories/product.repository');
    await updateProductById(productId, { averageRating });
  }

  return result;
};

export const calculateProductRating = async (productId: string) => {
  return ReviewModel.aggregate([
    { $match: { product: new Types.ObjectId(productId), status: 'approved' } },
    { $group: { _id: '$product', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
};
