import { Router } from 'express';
import { param } from 'express-validator';
import {
  getPublicRedirects,
  getAllRedirectsAdmin,
  createRedirect,
  updateRedirect,
  deleteRedirect,
} from '../controllers/redirect.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { validateRequest } from '../middlewares/validate.middleware';

const router = Router();
const idParam = [param('id').isMongoId().withMessage('Valid redirect ID is required'), validateRequest];

// Public: active redirects for the website (registered before /:id)
router.get('/public', getPublicRedirects);

router.get('/', authMiddleware, adminMiddleware, getAllRedirectsAdmin);
router.post('/', authMiddleware, adminMiddleware, createRedirect);
router.patch('/:id', authMiddleware, adminMiddleware, ...idParam, updateRedirect);
router.delete('/:id', authMiddleware, adminMiddleware, ...idParam, deleteRedirect);

export { router as redirectRouter };
