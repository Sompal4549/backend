import { Router } from 'express';
import { body } from 'express-validator';
import { getNavigationContent, saveNavigationContent } from '../controllers/navigation.controller.ts';
import { validateRequest } from '../middlewares/validate.middleware.ts';

export const navigationRouter = Router();

navigationRouter.get('/', getNavigationContent);
navigationRouter.put(
  '/',
  [
    body('navLinks').isArray().withMessage('navLinks must be an array'),
    body('navLinks.*.label').notEmpty().withMessage('Navigation link label is required'),
    body('navLinks.*.href').notEmpty().withMessage('Navigation link href is required'),
    body('navLinks.*.order').isNumeric().withMessage('Navigation link order is required'),
    body('navLinks.*.children').optional().isArray().withMessage('children must be an array'),
    body('navLinks.*.children.*.label').optional().notEmpty().withMessage('Child link label is required'),
    body('navLinks.*.children.*.href').optional().notEmpty().withMessage('Child link href is required'),
    body('socialLinks').isArray().withMessage('socialLinks must be an array'),
    body('socialLinks.*.label').notEmpty().withMessage('Social link label is required'),
    body('socialLinks.*.href').notEmpty().withMessage('Social link href is required'),
  ],
  validateRequest,
  saveNavigationContent
);
