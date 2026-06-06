import { Response } from 'express';
import { addReview, editReview, removeReview } from '../services/review.service.ts';
import { successResponse, errorResponse } from '../utils/api-response.ts';
import { AuthRequest } from '../middlewares/auth.middleware.ts';

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await addReview(req.user!.id, req.params.productId, req.body);
    successResponse(res, review, 'Review added', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
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
