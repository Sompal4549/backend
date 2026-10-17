import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { chatStats, createManual, getChat, listChats, saveWorkflow } from '../controllers/admin-chats.controller';

/** Admin chatbot inbox, mounted at /admin/chats */
export const adminChatsRouter = Router();

adminChatsRouter.use(authMiddleware, adminMiddleware);

adminChatsRouter.get('/', listChats);
adminChatsRouter.get('/stats', chatStats);
adminChatsRouter.put('/workflow', saveWorkflow);
adminChatsRouter.post('/manual', createManual);
adminChatsRouter.get('/:id', getChat);
