import { Router } from 'express';
import {
  submitEnquiry,
  getEnquiryPipeline,
  updateEnquiryStatus,
  exportEnquiries,
} from '../controllers/enquiry.controller';
import multer from 'multer';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const upload = multer({ storage: multer.memoryStorage() });
export const enquiryRouter = Router();

// Public endpoint for submitting enquiries
enquiryRouter.post(
  '/submit',
  upload.single('file'),
  [
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('mobileNumber').notEmpty().withMessage('Mobile number is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('projectType').notEmpty().withMessage('Project type is required'),
    body('message').notEmpty().withMessage('Message is required'),
  ],
  validateRequest,
  submitEnquiry
);

// Admin-protected endpoints for enquiry management
enquiryRouter.use(authMiddleware, adminMiddleware);

enquiryRouter.get('/', getEnquiryPipeline);
enquiryRouter.patch('/:id/status', [
  param('id').isMongoId().withMessage('Valid enquiry ID is required'),
  body('status')
    .isIn(['pending', 'contacted', 'resolved', 'cancelled', 'closed', 'new', 'qualified'])
    .withMessage('Invalid status'),
  body('notes').optional().isString(),
], validateRequest, updateEnquiryStatus);
enquiryRouter.get('/export', exportEnquiries);