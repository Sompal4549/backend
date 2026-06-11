import { Request, Response } from 'express';
import { addReview, editReview, removeReview, getProductReviews } from '../services/review.service';
import { successResponse, errorResponse } from '../utils/api-response';
import { AuthRequest } from '../middlewares/auth.middleware';
import jwt from 'jsonwebtoken';
import { config } from '../config/app.config';

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await addReview(req.user!.id, req.params.productId, req.body);
    successResponse(res, review, 'Review added', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const getReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const result = await getProductReviews(productId);

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

    const reviewsWithMine = result.reviews.map((rev) => ({
      ...rev,
      isMine: currentUserId ? rev.userId === currentUserId : false,
    }));

    res.status(200).json({
      success: true,
      averageRating: result.averageRating,
      reviews: reviewsWithMine,
    });
  } catch (error) {
    res.status((error as any).statusCode || 500).json({
      success: false,
      message: (error as Error).message,
    });
  }
};

export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await editReview(req.user!.id, req.params.id, req.body);
    successResponse(res, review, 'Review updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await removeReview(req.user!.id, req.params.id);
    successResponse(res, review, 'Review deleted');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
