import { Router } from 'express';
import {
  postChatbotSession,
  postChatbotSessionClear,
  postChatbotMessage,
  postChatbotMessageStream,
  postChatbotFeedback,
  getChatbotUpdates,
  getChatbotSpeak,
  postChatbotCall,
  postChatbotCallTurn,
  postChatbotCallTool,
  postChatbotCallSay,
  postChatbotCallEnd,
  postChatbotLead,
  postChatbotLeadOtp,
  getConversationsHandler,
  getStatsHandler,
} from '../controllers/chatbot.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

export const chatbotRouter = Router();

// Public conversation endpoints
chatbotRouter.post('/session', postChatbotSession);
chatbotRouter.post('/session/clear', postChatbotSessionClear);
chatbotRouter.post('/message', postChatbotMessage);
chatbotRouter.post('/message/stream', postChatbotMessageStream);
chatbotRouter.post('/feedback', postChatbotFeedback);
chatbotRouter.get('/updates', getChatbotUpdates);
chatbotRouter.get('/speak', getChatbotSpeak);
chatbotRouter.post('/speak', getChatbotSpeak);

// Spoken voice calls (OpenAI Realtime + Sarvam Bulbul TTS)
chatbotRouter.post('/call', postChatbotCall);
chatbotRouter.post('/call/turn', postChatbotCallTurn);
chatbotRouter.post('/call/tool', postChatbotCallTool);
chatbotRouter.post('/call/say', postChatbotCallSay);
chatbotRouter.post('/call/end', postChatbotCallEnd);

// Callback leads & WhatsApp OTP
chatbotRouter.post('/lead/otp', postChatbotLeadOtp);
chatbotRouter.post('/lead', postChatbotLead);

// Admin dashboard routes
chatbotRouter.get('/conversations', authMiddleware, adminMiddleware, getConversationsHandler);
chatbotRouter.get('/stats', authMiddleware, adminMiddleware, getStatsHandler);
