import { Request, Response } from 'express';
import {
  addReview,
  addReviewForCustomer,
  editReview,
  removeReview,
  getProductReviews,
  getAllReviews,
  moderateReview,
  bulkModerateReviews,
  bulkRemoveReviews,
} from '../services/review.service';
import { ROLE } from '../constants/roles.constants';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';
import { config } from '../config/app.config';

export const getAllReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const rating = req.query.rating ? parseInt(req.query.rating as string, 10) : undefined;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const result = await getAllReviews(page, limit, { rating, status, search });
  successResponse(res, result, 'All reviews retrieved');
});

export const createReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Admin route: create review for current admin user
  const review = await addReview(req.user!.id, req.params.productId, req.body);
  successResponse(res, review, 'Review added', 201);
});

export const createReviewForCustomer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { customerId } = req.body;
  const review = await addReviewForCustomer(req.params.productId, customerId, req.body);
  successResponse(res, review, 'Review added for customer', 201);
});

export const getReviews = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const rating = req.query.rating ? parseInt(req.query.rating as string, 10) : undefined;
  const result = await getProductReviews(productId, page, limit, rating);

  // Optional user authentication to determine which review is "mine"
  let currentUserId: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const payload = jwt.verify(token, config.jwtAccessSecret) as { userId?: string; leadId?: string };
      // Website customers carry leadId; staff carry userId
      currentUserId = payload.leadId || payload.userId || null;
    } catch (err) {
      // Ignore token errors for public reviews query
    }
  }

  type ReviewResponseItem = {
    _id: string;
    user: string;
    userId: string;
    rating: number;
    comment: string;
    createdAt: string | Date;
  };

  const reviewsWithMine = (result.reviews as ReviewResponseItem[]).map((rev) => ({
    ...rev,
    isMine: currentUserId ? rev.userId === currentUserId : false,
  }));

  successResponse(
    res,
    {
      averageRating: result.averageRating,
      reviews: reviewsWithMine,
      ...(result.pagination && { pagination: result.pagination }),
    },
    "Reviews retrieved"
  );
});

export const updateReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await editReview(req.user!.id, req.params.id, req.body);
  successResponse(res, review, 'Review updated');
});

const isAdminRequest = (req: AuthRequest) => {
  const role = (req.user as { role?: string } | undefined)?.role;
  return role === ROLE.ADMIN || role === ROLE.SUPERADMIN;
};

export const deleteReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await removeReview(req.user!.id, req.params.id, isAdminRequest(req));
  successResponse(res, review, 'Review deleted');
});

export const moderateReviewHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await moderateReview(req.params.id, req.body.status, req.user!.id);
  successResponse(res, review, req.body.status === 'approved' ? 'Review published' : 'Review hidden');
});

export const bulkReviewsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ids, action } = req.body as { ids: string[]; action: 'approve' | 'reject' | 'delete' };
  const result =
    action === 'delete'
      ? await bulkRemoveReviews(ids)
      : await bulkModerateReviews(ids, action === 'approve' ? 'approved' : 'rejected', req.user!.id);
  successResponse(res, result, `${ids.length} review${ids.length === 1 ? '' : 's'} updated`);
});
