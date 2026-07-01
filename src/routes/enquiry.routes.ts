import { Router } from 'express';
import { submitEnquiry } from '../controllers/enquiry.controller';
import multer from 'multer';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

const upload = multer({ storage: multer.memoryStorage() });
export const enquiryRouter = Router();

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