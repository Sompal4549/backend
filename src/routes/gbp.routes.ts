import { Router } from 'express';
import {
  getConnection,
  getOAuthUrl,
  disconnect,
  getLocations,
  getDashboard,
  getReviews,
  exportReviewsCsv,
  syncReviews,
  replyToReview,
  deleteReviewReply,
} from '../controllers/gbp.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

// Admin only. The Google OAuth callback (when implemented) must be registered above this line, unauthenticated.
router.use(authMiddleware, adminMiddleware);

router.get('/connection', getConnection);
router.get('/oauth/url', getOAuthUrl);
router.delete('/disconnect', disconnect);
router.get('/locations', getLocations);
router.get('/dashboard', getDashboard);
router.get('/reviews/export.csv', exportReviewsCsv);
router.get('/reviews', getReviews);
router.post('/reviews/sync', syncReviews);
router.post('/reviews/:id/reply', replyToReview);
router.delete('/reviews/:id/reply', deleteReviewReply);

export { router as gbpRouter };
