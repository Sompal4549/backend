import { Router } from 'express';
import {
  getPublicFaqs,
  getAllFaqsAdmin,
  getFaqById,
  createFaq,
  updateFaq,
  deleteFaq,
} from '../controllers/faq.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

router.get('/', getPublicFaqs);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllFaqsAdmin);
router.get('/:id', authMiddleware, adminMiddleware, getFaqById);
router.post('/', authMiddleware, adminMiddleware, createFaq);
router.put('/:id', authMiddleware, adminMiddleware, updateFaq);
router.delete('/:id', authMiddleware, adminMiddleware, deleteFaq);

export { router as faqRouter };
