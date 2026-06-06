import { Router } from 'express';
import * as projectController from '../controllers/project.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { adminMiddleware } from '../middlewares/admin.middleware.ts';
import { param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware.ts';

const router = Router();

router.get('/', projectController.getProjects);

router.post('/', projectController.createProject);

router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Valid project id is required')],
  validateRequest,
  projectController.updateProject
);

router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  [param('id').isMongoId().withMessage('Valid project id is required')],
  validateRequest,
  projectController.deleteProject
);

export { router as projectRouter };