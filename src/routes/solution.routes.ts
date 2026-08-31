import { Router } from 'express';
import { getAllSolutions, getSolutionBySlug, createSolution, updateSolution, deleteSolution, getFeaturedSolutions } from '../controllers/solution.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

router.get('/', getAllSolutions);
router.get('/featured', getFeaturedSolutions);
router.get('/:slug', getSolutionBySlug);
router.post('/', authMiddleware, adminMiddleware, createSolution);
router.put('/:id', authMiddleware, adminMiddleware, updateSolution);
router.delete('/:id', authMiddleware, adminMiddleware, deleteSolution);

export { router as solutionRouter };
