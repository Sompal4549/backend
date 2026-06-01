import { Router } from 'express';
import { createReview, updateReview, deleteReview } from '../controllers/review.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

export const reviewRouter = Router();

reviewRouter.post(
  '/:productId',
  authMiddleware,
  [body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'), body('comment').notEmpty().withMessage('Comment is required')],
  validateRequest,
  createReview
);
reviewRouter.put(
  '/:id',
  authMiddleware,
  [body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5')],
  validateRequest,
  updateReview
);
reviewRouter.delete('/:id', authMiddleware, deleteReview);
