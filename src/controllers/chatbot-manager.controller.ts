import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import {
  getDraftConfigService,
  getManagerService,
  getPublishedConfigService,
  publishManagerService,
  restoreVersionService,
  saveDraftSectionService,
} from '../services/chatbot-manager.service';
import { buildKnowledge, generateBotReply } from './chatbot.controller';

const adminName = (req: Request) => {
  const user = (req as any).user;
  return user?.name || user?.email || 'Admin';
};

// GET /admin/chatbot/manager — draft of every section, versions, change counts
export const getManager = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, await getManagerService(), 'Chatbot manager');
});

// PUT /admin/chatbot/manager/draft — { section, data }: saves one section of the draft
export const saveDraftSection = asyncHandler(async (req: Request, res: Response) => {
  successResponse(res, await saveDraftSectionService(String(req.body.section), req.body.data), 'Draft saved');
});

// POST /admin/chatbot/manager/publish — { note }: the draft goes live
export const publishManager = asyncHandler(async (req: Request, res: Response) => {
  successResponse(res, await publishManagerService(String(req.body.note || ''), adminName(req)), 'Published');
});

// POST /admin/chatbot/manager/restore — { minor }: that version becomes the draft again
export const restoreVersion = asyncHandler(async (req: Request, res: Response) => {
  successResponse(res, await restoreVersionService(Number(req.body.minor)), 'Restored to draft');
});

// Knowledge sources and the review queue are not part of the Ensis chatbot yet:
// answer with empty data instead of a 404.
export const listSources = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, [], 'Sources');
});

export const getReviewQueue = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, [], 'Review queue');
});

// POST /admin/chatbot/test — { question, language, mode, history }: the real bot's reply,
// answering from the draft or the published Questions & Answers
export const testBot = asyncHandler(async (req: Request, res: Response) => {
  const question = typeof req.body.question === 'string' ? req.body.question.trim() : '';
  if (!question) throw new AppError(400, 'question is required');
  const config = req.body.mode === 'live' ? await getPublishedConfigService() : await getDraftConfigService();
  const history = Array.isArray(req.body.history) ? req.body.history : [];
  const language = req.body.language === 'हिंदी' || req.body.language === 'Hindi' ? 'hi' : undefined;
  const { reply, provider } = await generateBotReply(question, history, undefined, language, buildKnowledge(config));
  successResponse(res, { text: reply, found: provider !== 'fallback' }, 'Test reply');
});

export const sourcesNotAvailable = asyncHandler(async () => {
  throw new AppError(501, 'Knowledge sources are not available for the Ensis chatbot yet.');
});
