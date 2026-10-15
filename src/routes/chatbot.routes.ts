import { Router } from 'express';
import {
  postChatbotMessage,
  getConversationsHandler,
  getStatsHandler,
} from '../controllers/chatbot.controller';

export const chatbotRouter = Router();

chatbotRouter.post('/message', postChatbotMessage);
chatbotRouter.get('/conversations', getConversationsHandler);
chatbotRouter.get('/stats', getStatsHandler);