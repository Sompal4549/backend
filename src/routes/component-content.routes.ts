import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  editComponentContent,
  editHomeComponent,
  getComponentContent,
  getComponentContents,
  getComponentsByPage,
  getHomeComponentContent,
  getHomeComponentContents,
  removeComponentContent,
  removeHomeComponent,
  saveHomeComponent,
  saveComponentContent,
} from '../controllers/component-content.controller';
import { validateRequest } from '../middlewares/validate.middleware';

export const componentContentRouter = Router();

componentContentRouter.get('/', getComponentContents);
componentContentRouter.get('/home', getHomeComponentContents);

componentContentRouter.get(
  '/page/:page',
  [param('page').notEmpty().withMessage('Page name is required')],
  validateRequest,
  getComponentsByPage
);

componentContentRouter.get('/home/:key', [param('key').notEmpty().withMessage('Component key is required')], validateRequest, getHomeComponentContent);

componentContentRouter.post(
  '/home',
  [
    body('key').notEmpty().withMessage('Component key is required'),
    body('label').notEmpty().withMessage('Label is required'),
    body('data').isObject().withMessage('Data must be a JSON object'),
  ],
  validateRequest,
  saveHomeComponent
);

componentContentRouter.put(
  '/home/:id',
  [
    param('id').isMongoId().withMessage('Valid content id is required'),
    body('key').optional().notEmpty().withMessage('Component key is required'),
    body('label').optional().notEmpty().withMessage('Label is required'),
    body('index').optional().isNumeric().withMessage('Index must be a number'),
    body('data').optional().isObject().withMessage('Data must be a JSON object'),
  ],
  validateRequest,
  editHomeComponent
);

componentContentRouter.delete(
  '/home/:id',
  [param('id').isMongoId().withMessage('Valid content id is required')],
  validateRequest,
  removeHomeComponent
);

componentContentRouter.get('/:key', [param('key').notEmpty().withMessage('Component key is required')], validateRequest, getComponentContent);

componentContentRouter.post(
  '/',
  [
    body('key').notEmpty().withMessage('Component key is required'),
    body('label').notEmpty().withMessage('Label is required'),
    body('page').notEmpty().withMessage('Page is required'),
    body('index').optional().isNumeric().withMessage('Index must be a number'),
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
    body('index').optional().isNumeric().withMessage('Index must be a number'),
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
