import { Router } from 'express';
import * as careerController from '../controllers/career.controller';
import { createJob, deleteJob, getJob, listJobs, updateJob } from '../controllers/careers-admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

const router = Router();

router.get('/', careerController.getCareers);

// Admin Job Postings (before the /:id routes)
router.get('/admin/jobs', authMiddleware, adminMiddleware, listJobs);
router.post('/admin/jobs', authMiddleware, adminMiddleware, createJob);
router.get('/admin/jobs/:id', authMiddleware, adminMiddleware, getJob);
router.patch('/admin/jobs/:id', authMiddleware, adminMiddleware, updateJob);
router.delete('/admin/jobs/:id', authMiddleware, adminMiddleware, deleteJob);

router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('location').notEmpty().withMessage('Location is required'),
    body('type').notEmpty().withMessage('Type (e.g., Full-time) is required'),
    body('experience').notEmpty().withMessage('Experience level is required'),
    body('status').optional().isIn(['active', 'closed']).withMessage('Invalid status'),
  ],
  validateRequest,
  careerController.createCareer
);

router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Valid career id is required')],
  validateRequest,
  careerController.updateCareer
);

router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Valid career id is required')],
  validateRequest,
  careerController.deleteCareer
);

export { router as careerRouter };