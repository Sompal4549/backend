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
    body('state').notEmpty().withMessage('State is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('projectType').notEmpty().withMessage('Project type is required'),
    body('projectSize').notEmpty().withMessage('Project size is required'),
    body('budgetRange').notEmpty().withMessage('Budget range is required'),
    body('timeline').notEmpty().withMessage('Timeline is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('preferredContact').notEmpty().withMessage('Preferred contact method is required'),
  ],
  validateRequest,
  submitEnquiry
);