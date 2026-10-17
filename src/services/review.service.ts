import { AppError } from '../utils/app-error';
import {
  createReview,
  findReviewByUserAndProduct,
  getReviewById,
  updateReviewById,
  deleteReviewById,
  calculateProductRating,
  getReviewsForProduct,
  getPaginatedReviewsForProduct,
  countReviewsForProduct,
  getAllReviewsPaginated,
  updateReviewStatus,
  bulkUpdateReviewStatus,
  bulkDeleteReviews,
} from '../repositories/review.repository';
import { updateProductById } from '../repositories/product.repository';
import { IReview } from '../models/review.model';
import { Types } from 'mongoose';
import { UserModel } from '../models/user.model';
import { LeadModel } from '../models/lead.model';
import { OrderModel } from '../models/order.model';

// Only these fields come from the request; user, product, status and verifiedBuyer are set here
const pickReviewFields = (payload: Partial<IReview>) => {
  const data: Partial<IReview> = {};
  if (payload.rating !== undefined) data.rating = Number(payload.rating);
  if (payload.title !== undefined) data.title = String(payload.title).slice(0, 150);
  if (payload.comment !== undefined) data.comment = String(payload.comment).slice(0, 2000);
  return data;
};

/** Display name for whoever wrote the review — website customers are Leads, staff are Users */
const authorNameFor = async (authorId: string) => {
  const lead = await LeadModel.findById(authorId).select('firstName lastName companyName').lean();
  if (lead) return [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.companyName || 'Customer';
  const user = await UserModel.findById(authorId).select('name').lean();
  return user?.name || 'Customer';
};

const hasPaidOrderFor = async (customerId: string, productId: string) =>
  Boolean(
    await OrderModel.exists({
      user: customerId,
      'items.product': productId,
      paymentStatus: 'paid',
      orderStatus: { $ne: 'cancelled' },
    })
  );

export const addReview = async (userId: string, productId: string, payload: Partial<IReview>) => {
  const existing = await findReviewByUserAndProduct(userId, productId);
  if (existing) {
    throw new AppError(409, 'You have already reviewed this product');
  }
  const review = await createReview({
    ...pickReviewFields(payload),
    user: new Types.ObjectId(userId),
    product: new Types.ObjectId(productId),
    authorName: await authorNameFor(userId),
    verifiedBuyer: await hasPaidOrderFor(userId, productId),
    // Published straight away; admins can hide or remove it from Product Reviews
    status: 'approved',
  });
  await recalculateRating(productId);
  return review;
};

export const addReviewForCustomer = async (productId: string, customerId: string, payload: Partial<IReview>) => {
  const customer = (await LeadModel.exists({ _id: customerId })) || (await UserModel.exists({ _id: customerId }));
  if (!customer) {
    throw new AppError(404, 'Target customer not found');
  }

  const existing = await findReviewByUserAndProduct(customerId, productId);
  if (existing) {
    throw new AppError(409, 'This customer has already reviewed the product');
  }

  const review = await createReview({
    ...pickReviewFields(payload),
    user: new Types.ObjectId(customerId),
    product: new Types.ObjectId(productId),
    authorName: await authorNameFor(customerId),
    verifiedBuyer: await hasPaidOrderFor(customerId, productId),
    status: 'approved',
  });
  await recalculateRating(productId);
  return review;
};

export const editReview = async (userId: string, reviewId: string, payload: Partial<IReview>) => {
  const review = await getReviewById(reviewId);
  if (!review || review.user.toString() !== userId) {
    throw new AppError(404, 'Review not found or unauthorized');
  }
  const updated = await updateReviewById(reviewId, pickReviewFields(payload));
  await recalculateRating(review.product.toString());
  return updated;
};

/** The author may delete their own review; admins may delete any review */
export const removeReview = async (userId: string, reviewId: string, isAdmin = false) => {
  const review = await getReviewById(reviewId);
  if (!review || (!isAdmin && review.user.toString() !== userId)) {
    throw new AppError(404, 'Review not found or unauthorized');
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
  let reviews;
  let totalCount = undefined;
  if (page && limit) {
    const pg = Math.max(page, 1);
    const lt = Math.max(limit, 1);
    reviews = await getPaginatedReviewsForProduct(productId, pg, lt, rating);
    totalCount = await countReviewsForProduct(productId, rating);
  } else {
    reviews = (await getReviewsForProduct(productId)) || [];
  }

  const ratingStats = await calculateProductRating(productId);
  const averageRating = ratingStats?.[0]?.averageRating || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nameOf = (rev: any) => rev.authorName || rev.user?.name || 'Anonymous';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedReviews = (reviews || []).map((rev: any) => ({
    _id: rev._id.toString(),
    user: nameOf(rev),
    // populate() yields null for customers (Leads aren't Users); populated() still has the raw id
    userId: String(rev.populated?.('user') ?? rev.user?._id ?? rev.user ?? ''),
    rating: rev.rating,
    comment: rev.comment || '',
    verifiedBuyer: Boolean(rev.verifiedBuyer),
    createdAt: rev.createdAt,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {
    rating: averageRating,
    averageRating: averageRating,
    reviews: formattedReviews,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userReviews: (reviews || []).map((rev: any) => ({
      userName: nameOf(rev),
      rating: rev.rating,
      reviewDescription: rev.comment || rev.description || '',
    })),
  };

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

// Admin moderation functions
export const getAllReviews = async (
  page?: number,
  limit?: number,
  filters: { status?: string; rating?: number; productId?: string; search?: string } = {}
) => {
  const pg = Math.max(page || 1, 1);
  const lt = Math.min(Math.max(limit || 20, 1), 100);
  return getAllReviewsPaginated(pg, lt, filters);
};

export const moderateReview = async (
  reviewId: string,
  status: 'approved' | 'rejected',
  moderatorId: string
) => {
  const review = await updateReviewStatus(reviewId, status, moderatorId);
  if (!review) {
    throw new AppError(404, 'Review not found');
  }
  return review;
};

export const bulkModerateReviews = async (
  reviewIds: string[],
  status: 'approved' | 'rejected',
  moderatorId: string
) => {
  return await bulkUpdateReviewStatus(reviewIds, status, moderatorId);
};

export const bulkRemoveReviews = async (reviewIds: string[]) => {
  return await bulkDeleteReviews(reviewIds);
};

const recalculateRating = async (productId: string) => {
  const result = await calculateProductRating(productId);
  const averageRating = result?.[0]?.averageRating || 0;
  await updateProductById(productId, { averageRating });
};
