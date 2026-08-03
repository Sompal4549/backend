import { Request, Response } from 'express';
import { addReview, addReviewForCustomer, editReview, removeReview, getProductReviews } from '../services/review.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';
import { config } from '../config/app.config';

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
      const payload = jwt.verify(token, config.jwtAccessSecret) as { userId: string };
      currentUserId = payload.userId;
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

  res.status(200).json({
    success: true,
    averageRating: result.averageRating,
    reviews: reviewsWithMine,
    ...(result.pagination && { pagination: result.pagination })
  });
});

export const updateReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await editReview(req.user!.id, req.params.id, req.body);
  successResponse(res, review, 'Review updated');
});

export const deleteReview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await removeReview(req.user!.id, req.params.id);
  successResponse(res, review, 'Review deleted');
});
