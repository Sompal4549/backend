import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProductHandler, deleteProductHandler } from '../controllers/product.controller';
import { getBackupsHandler, createBackupHandler, getBackupHandler, restoreBackupHandler, deleteBackupHandler, deleteAllBackupsHandler } from '../controllers/product-backup.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

export const productRouter = Router();

// ─── Public product routes ──────────────────────────────────────────────────
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

// ─── Admin product write routes ─────────────────────────────────────────────
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

// ─── Backup routes ───────────────────────────────────────────────────────────
// Specific backup by backupId (must come BEFORE /:id/backups to avoid conflict)
productRouter.get(
  '/backups/:backupId',
  authMiddleware,
  adminMiddleware,
  [param('backupId').isMongoId().withMessage('Valid backup id is required')],
  validateRequest,
  getBackupHandler
);
productRouter.post(
  '/backups/:backupId/restore',
  authMiddleware,
  adminMiddleware,
  [param('backupId').isMongoId().withMessage('Valid backup id is required')],
  validateRequest,
  restoreBackupHandler
);
productRouter.delete(
  '/backups/:backupId',
  authMiddleware,
  adminMiddleware,
  [param('backupId').isMongoId().withMessage('Valid backup id is required')],
  validateRequest,
  deleteBackupHandler
);

// Backups for a product
productRouter.get(
  '/:id/backups',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Valid product id is required')],
  validateRequest,
  getBackupsHandler
);
productRouter.post(
  '/:id/backups',
  authMiddleware,
  adminMiddleware,
  [
    param('id').isMongoId().withMessage('Valid product id is required'),
    body('note').optional().isString(),
  ],
  validateRequest,
  createBackupHandler
);
productRouter.delete(
  '/:id/backups',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Valid product id is required')],
  validateRequest,
  deleteAllBackupsHandler
);
