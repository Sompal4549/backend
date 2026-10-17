import { ReviewModel, IReview } from '../models/review.model';
import { ProductModel } from '../models/product.model';
import { Types } from 'mongoose';

// The website only ever shows approved reviews
const PUBLIC = { status: 'approved' } as const;

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
  return ReviewModel.find({ product: productId, ...PUBLIC }).populate('user', 'name').sort({ createdAt: -1 });
};

// Paginated public reviews with optional rating filter
export const getPaginatedReviewsForProduct = async (
  productId: string,
  page: number = 1,
  limit: number = 50,
  rating?: number
) => {
  const query: Record<string, unknown> = { product: productId, ...PUBLIC };
  if (rating !== undefined) {
    query.rating = rating;
  }
  const skip = (page - 1) * limit;
  return ReviewModel.find(query)
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

export const countReviewsForProduct = async (productId: string, rating?: number) => {
  const query: Record<string, unknown> = { product: productId, ...PUBLIC };
  if (rating !== undefined) {
    query.rating = rating;
  }
  return ReviewModel.countDocuments(query);
};

const recalculateRatings = async (productIds: string[]) => {
  for (const productId of [...new Set(productIds)]) {
    const result = await calculateProductRating(productId);
    await ProductModel.updateOne({ _id: productId }, { $set: { averageRating: result?.[0]?.averageRating || 0 } });
  }
};

// Admin moderation functions
export const getAllReviewsPaginated = async (
  page: number = 1,
  limit: number = 20,
  filters: { status?: string; rating?: number; productId?: string; search?: string } = {}
) => {
  const query: Record<string, unknown> = {};

  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  if (filters.rating) {
    query.rating = filters.rating;
  }
  if (filters.productId) {
    query.product = filters.productId;
  }

  const term = filters.search?.trim();
  if (term) {
    // Escaped so typed text can never act as a regex pattern
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const products = await ProductModel.find({ title: regex }).select('_id').limit(200).lean();
    query.$or = [
      { comment: regex },
      { title: regex },
      { authorName: regex },
      { product: { $in: products.map((p) => p._id) } },
    ];
  }

  const skip = (page - 1) * limit;

  const [reviews, totalCount, statusCounts] = await Promise.all([
    ReviewModel.find(query)
      .populate('user', 'name email')
      .populate('product', 'title slug images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReviewModel.countDocuments(query),
    ReviewModel.aggregate<{ _id: string; count: number; avg: number }>([
      { $group: { _id: '$status', count: { $sum: 1 }, avg: { $avg: '$rating' } } },
    ]),
  ]);

  const approved = statusCounts.find((s) => s._id === 'approved');
  return {
    reviews,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    summary: {
      total: statusCounts.reduce((sum, s) => sum + s.count, 0),
      byStatus: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
      averageApprovedRating: approved ? Math.round(approved.avg * 10) / 10 : 0,
    },
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
  ).populate('product', 'title');

  // Approving adds the rating; rejecting a published review removes it
  if (review) {
    const product = review.product as unknown as { _id?: Types.ObjectId } | Types.ObjectId;
    await recalculateRatings([String((product as { _id?: Types.ObjectId })._id || product)]);
  }

  return review;
};

export const bulkUpdateReviewStatus = async (
  reviewIds: string[],
  status: 'approved' | 'rejected',
  moderatorId: string
) => {
  const ids = reviewIds.map((id) => new Types.ObjectId(id));
  const result = await ReviewModel.updateMany(
    { _id: { $in: ids } },
    { $set: { status, moderatedAt: new Date(), moderatedBy: new Types.ObjectId(moderatorId) } }
  );
  const reviews = await ReviewModel.find({ _id: { $in: ids } }).select('product').lean();
  await recalculateRatings(reviews.map((r) => r.product.toString()));
  return result;
};

export const bulkDeleteReviews = async (reviewIds: string[]) => {
  const ids = reviewIds.map((id) => new Types.ObjectId(id));
  // Read the affected products before the reviews are gone
  const reviews = await ReviewModel.find({ _id: { $in: ids } }).select('product').lean();
  const result = await ReviewModel.deleteMany({ _id: { $in: ids } });
  await recalculateRatings(reviews.map((r) => r.product.toString()));
  return result;
};

export const calculateProductRating = async (productId: string) => {
  return ReviewModel.aggregate([
    { $match: { product: new Types.ObjectId(productId), status: 'approved' } },
    { $group: { _id: '$product', averageRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
};
