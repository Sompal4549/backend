import { Router } from 'express';
import { body } from 'express-validator';
import { getFooterContent, saveFooterContent } from '../controllers/footer.controller';
import { validateRequest } from '../middlewares/validate.middleware';

export const footerRouter = Router();

footerRouter.get('/', getFooterContent);
footerRouter.put(
  '/',
  [
    body('companyDescription').isString().withMessage('companyDescription must be a string'),
    body('quickLinks').isArray().withMessage('quickLinks must be an array'),
    body('productCategories').isArray().withMessage('productCategories must be an array'),
    body('solutionLinks').isArray().withMessage('solutionLinks must be an array'),
    body('contact').isObject().withMessage('contact must be an object'),
    body('contact.address').isString().withMessage('contact.address must be a string'),
    body('contact.phone').isString().withMessage('contact.phone must be a string'),
    body('contact.email').isString().withMessage('contact.email must be a string'),
    body('socialLinks').isArray().withMessage('socialLinks must be an array'),
    body('legalLinks').isArray().withMessage('legalLinks must be an array'),
    body('copyrightText').isString().withMessage('copyrightText must be a string'),
  ],
  validateRequest,
  saveFooterContent
);
