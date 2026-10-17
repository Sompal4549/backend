import { Router } from 'express';
import {
  getAllSolutions,
  getAllSolutionsAdmin,
  getSolutionBySlug,
  createSolution,
  updateSolution,
  updateSolutionCities,
  deleteSolution,
  getFeaturedSolutions,
} from '../controllers/solution.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

router.get('/', getAllSolutions);
router.get('/featured', getFeaturedSolutions);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllSolutionsAdmin);
router.get('/:slug', getSolutionBySlug);
router.post('/', authMiddleware, adminMiddleware, createSolution);
router.put('/:id', authMiddleware, adminMiddleware, updateSolution);
router.put('/:id/cities', authMiddleware, adminMiddleware, updateSolutionCities);
router.delete('/:id', authMiddleware, adminMiddleware, deleteSolution);

export { router as solutionRouter };
