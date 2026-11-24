import { Router } from 'express';
import { handleSubscription, listSubscribers, sendBlogMails, createSubscriberAdmin } from '../controllers/newsletter.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

router.post('/subscribe', handleSubscription);
router.get('/', authMiddleware, adminMiddleware, listSubscribers);
router.get('/admin', authMiddleware, adminMiddleware, listSubscribers);
router.post('/admin', authMiddleware, adminMiddleware, createSubscriberAdmin);
router.post('/send-blog', authMiddleware, adminMiddleware, sendBlogMails);

export { router as newsletterRouter };