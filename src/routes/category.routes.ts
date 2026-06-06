import { Router } from 'express';
import { body, param } from 'express-validator';
import { addCategory, editCategory, getCategories, removeCategory } from '../controllers/category.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { adminMiddleware } from '../middlewares/admin.middleware.ts';
import { validateRequest } from '../middlewares/validate.middleware.ts';

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
