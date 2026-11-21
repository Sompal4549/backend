import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getCategories,
  addCategory,
  editCategory,
  removeCategory,
  restoreCategoryHandler,
} from '../controllers/category.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { validateRequest } from '../middlewares/validate.middleware';

export const categoryRouter = Router();

categoryRouter.get('/', getCategories);
categoryRouter.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('name').notEmpty().withMessage('Category name is required'),
    body('description').optional().isString().trim(),
  ],
  validateRequest,
  addCategory
);
categoryRouter.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isMongoId().withMessage('Valid category id is required'),
    body('name').optional().notEmpty().withMessage('Category name is required'),
    body('description').optional().isString().trim(),
  ],
  validateRequest,
  editCategory
);
categoryRouter.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Valid category id is required')],
  validateRequest,
  removeCategory
);
categoryRouter.post(
  '/:id/restore',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Valid category id is required')],
  validateRequest,
  restoreCategoryHandler
);