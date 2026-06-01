import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProductHandler, deleteProductHandler } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

export const productRouter = Router();

productRouter.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be a positive number'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  ],
  validateRequest,
  getProducts
);
productRouter.get('/:id', [param('id').notEmpty().withMessage('Product id or slug is required')], validateRequest, getProductById);
productRouter.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('discountPrice').optional().isFloat({ min: 0 }).withMessage('Discount price must be a positive number'),
    body('category').isMongoId().withMessage('Valid category is required'),
    body('subCategory').optional().isMongoId().withMessage('Valid sub category is required'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a positive integer'),
    body('images').optional().isArray().withMessage('Images must be an array'),
    body('variants').optional().isArray().withMessage('Variants must be an array'),
  ],
  validateRequest,
  createProduct
);
productRouter.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isMongoId().withMessage('Valid product id is required'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('discountPrice').optional().isFloat({ min: 0 }).withMessage('Discount price must be a positive number'),
    body('category').optional().isMongoId().withMessage('Valid category is required'),
    body('subCategory').optional().isMongoId().withMessage('Valid sub category is required'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a positive integer'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  ],
  validateRequest,
  updateProductHandler
);
productRouter.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Valid product id is required')],
  validateRequest,
  deleteProductHandler
);
