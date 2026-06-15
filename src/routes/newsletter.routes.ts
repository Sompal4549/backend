import { Router } from 'express';
import { handleSubscription, listSubscribers, sendBlogMails } from '../controllers/newsletter.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

router.post('/subscribe', handleSubscription);
router.get('/', authMiddleware, adminMiddleware, listSubscribers);
router.post('/send-blog', authMiddleware, adminMiddleware, sendBlogMails);

export { router as newsletterRouter };