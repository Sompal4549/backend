import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

router.get('/', projectController.getProjects);

router.post('/', projectController.createProject);
router.put('/:id', authMiddleware, adminMiddleware, projectController.updateProject);
router.delete('/:id', authMiddleware, adminMiddleware, projectController.deleteProject);

export { router as projectRouter };