import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import {
  addTrainingItem,
  attachChat,
  blockVisitor,
  chatStats,
  clearVisitorMessages,
  closeVisitorChats,
  createManual,
  deleteTrainingItem,
  deleteVisitorHistory,
  getChat,
  getTraining,
  getTrainingKnowledge,
  getTrainingSettings,
  getVisitor,
  listChats,
  listVisitors,
  reindexKnowledge,
  releaseChat,
  replyChat,
  saveTrainingSettings,
  saveWorkflow,
  speakTraining,
  takeoverChat,
  testTraining,
  unblockVisitor,
  updateTrainingItem,
  uploadTrainingFile,
} from '../controllers/admin-chats.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/** Admin chatbot inbox, mounted at /admin/chats */
export const adminChatsRouter = Router();

adminChatsRouter.use(authMiddleware, adminMiddleware);

adminChatsRouter.get('/', listChats);
adminChatsRouter.get('/stats', chatStats);
adminChatsRouter.put('/workflow', saveWorkflow);
adminChatsRouter.post('/manual', createManual);

// Training & Knowledge routes (MUST be before /:id)
adminChatsRouter.get('/training', getTraining);
adminChatsRouter.get('/training/settings', getTrainingSettings);
adminChatsRouter.put('/training/settings', saveTrainingSettings);
adminChatsRouter.get('/training/knowledge', getTrainingKnowledge);
adminChatsRouter.post('/training', addTrainingItem);
adminChatsRouter.post('/training/file', upload.single('file'), uploadTrainingFile);
adminChatsRouter.put('/training/:id', updateTrainingItem);
adminChatsRouter.delete('/training/:id', deleteTrainingItem);
adminChatsRouter.post('/training/test', testTraining);
adminChatsRouter.get('/training/speak', speakTraining);
adminChatsRouter.post('/reindex', reindexKnowledge);

// Visitor blocking & history routes (before /:id)
adminChatsRouter.get('/visitors', listVisitors);
adminChatsRouter.get('/visitors/:ip', getVisitor);
adminChatsRouter.post('/visitors/:ip/block', blockVisitor);
adminChatsRouter.post('/visitors/:ip/unblock', unblockVisitor);
adminChatsRouter.post('/visitors/:ip/close', closeVisitorChats);
adminChatsRouter.post('/visitors/:ip/clear', clearVisitorMessages);
adminChatsRouter.delete('/visitors/:ip/history', deleteVisitorHistory);

// Single chat routes & live takeover
adminChatsRouter.get('/:id', getChat);
adminChatsRouter.post('/:id/takeover', takeoverChat);
adminChatsRouter.post('/:id/release', releaseChat);
adminChatsRouter.post('/:id/reply', replyChat);
adminChatsRouter.post('/:id/attach', attachChat);
