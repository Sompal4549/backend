import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import {
  getManager,
  getReviewQueue,
  listSources,
  publishManager,
  restoreVersion,
  saveDraftSection,
  sourcesNotAvailable,
  testBot,
} from '../controllers/chatbot-manager.controller';

/** Admin Chatbot Manager — mounted at /admin/chatbot */
export const chatbotManagerRouter = Router();

chatbotManagerRouter.use(authMiddleware, adminMiddleware);

chatbotManagerRouter.get('/manager', getManager);
chatbotManagerRouter.put('/manager/draft', saveDraftSection);
chatbotManagerRouter.post('/manager/publish', publishManager);
chatbotManagerRouter.post('/manager/restore', restoreVersion);

chatbotManagerRouter.get('/sources', listSources);
chatbotManagerRouter.post('/sources', sourcesNotAvailable);
chatbotManagerRouter.post('/sources/check', sourcesNotAvailable);
chatbotManagerRouter.post('/sources/:id/refresh', sourcesNotAvailable);
chatbotManagerRouter.patch('/sources/:id', sourcesNotAvailable);
chatbotManagerRouter.delete('/sources/:id', sourcesNotAvailable);

chatbotManagerRouter.post('/test', testBot);
chatbotManagerRouter.get('/review', getReviewQueue);
chatbotManagerRouter.post('/review/dismiss', getReviewQueue);
