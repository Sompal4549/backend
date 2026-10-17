import { Router } from 'express';
import {
  postChatbotMessage,
  postChatbotLead,
  postChatbotLeadOtp,
  getConversationsHandler,
  getStatsHandler,
} from '../controllers/chatbot.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

export const chatbotRouter = Router();

chatbotRouter.post('/message', postChatbotMessage);
chatbotRouter.post('/lead/otp', postChatbotLeadOtp);
chatbotRouter.post('/lead', postChatbotLead);
// Chats hold visitors' names and phone numbers: admin only
chatbotRouter.get('/conversations', authMiddleware, adminMiddleware, getConversationsHandler);
chatbotRouter.get('/stats', authMiddleware, adminMiddleware, getStatsHandler);
