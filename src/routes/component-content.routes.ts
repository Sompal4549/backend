import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  editComponentContent,
  getComponentContent,
  getComponentContents,
  removeComponentContent,
  saveComponentContent,
} from '../controllers/component-content.controller.js';
import { validateRequest } from '../middlewares/validate.middleware.js';

export const componentContentRouter = Router();

componentContentRouter.get('/', getComponentContents);
componentContentRouter.get('/:key', [param('key').notEmpty().withMessage('Component key is required')], validateRequest, getComponentContent);

componentContentRouter.post(
  '/',
  [
    body('key').notEmpty().withMessage('Component key is required'),
    body('label').notEmpty().withMessage('Label is required'),
    body('page').notEmpty().withMessage('Page is required'),
    body('data').isObject().withMessage('Data must be a JSON object'),
  ],
  validateRequest,
  saveComponentContent
);

componentContentRouter.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Valid content id is required'),
    body('key').optional().notEmpty().withMessage('Component key is required'),
    body('label').optional().notEmpty().withMessage('Label is required'),
    body('page').optional().notEmpty().withMessage('Page is required'),
    body('data').optional().isObject().withMessage('Data must be a JSON object'),
  ],
  validateRequest,
  editComponentContent
);

componentContentRouter.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Valid content id is required')],
  validateRequest,
  removeComponentContent
);
