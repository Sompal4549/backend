import { Router } from 'express';
import { getAllBlogs, getBlogBySlug, createBlog, updateBlog, deleteBlog, getPopularBlogs, getFeaturedBlogs } from '../controllers/blog.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

router.get('/', getAllBlogs);
router.get('/popular', getPopularBlogs);
router.get('/featured', getFeaturedBlogs);
router.get('/:slug', getBlogBySlug);
router.post('/', authMiddleware, adminMiddleware, createBlog);
router.put('/:id', authMiddleware, adminMiddleware, updateBlog);
router.delete('/:id', authMiddleware, adminMiddleware, deleteBlog);

export { router as blogRouter };