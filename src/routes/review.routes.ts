import { Router } from 'express';
import {
  createReview,
  updateReview,
  deleteReview,
  getReviews,
  getAllReviewsHandler,
  moderateReviewHandler,
  bulkReviewsHandler,
} from '../controllers/review.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

export const reviewRouter = Router();

// Admin: every review (any status) for moderation
reviewRouter.get('/', authMiddleware, adminMiddleware, getAllReviewsHandler);
reviewRouter.post(
  '/bulk',
  authMiddleware,
  adminMiddleware,
  [
    body('ids').isArray({ min: 1, max: 200 }).withMessage('Select at least one review'),
    body('ids.*').isMongoId().withMessage('Invalid review id'),
    body('action').isIn(['approve', 'reject', 'delete']).withMessage('Invalid action'),
  ],
  validateRequest,
  bulkReviewsHandler
);
reviewRouter.patch(
  '/:id/status',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Invalid review id'), body('status').isIn(['approved', 'rejected']).withMessage('Invalid status')],
  validateRequest,
  moderateReviewHandler
);

// Website: approved reviews of one product
reviewRouter.get('/:productId', getReviews);
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
  [
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comment').optional().isString().withMessage('Comment must be a string')
  ],
  validateRequest,
  updateReview
);
// The author, or any admin
reviewRouter.delete('/:id', authMiddleware, deleteReview);
