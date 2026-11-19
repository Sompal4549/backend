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
import {
  getReviewQueueItems,
  dismissReviewQueueItem,
  approveReviewQuestion,
} from '../services/chatbot-learn.service';
import { ChatKnowledgeModel, ChatTrainingModel } from '../models/chatbot-training.model';

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

// GET /admin/chatbot/sources — list active knowledge sources (web pages, documents, notes)
export const listSources = asyncHandler(async (_req: Request, res: Response) => {
  const [trainings, knowledgeUrls] = await Promise.all([
    ChatTrainingModel.find({}).sort({ updatedAt: -1 }).limit(50).lean(),
    ChatKnowledgeModel.aggregate([
      { $group: { _id: '$url', title: { $first: '$title' }, chars: { $sum: { $strLenCP: '$text' } }, updatedAt: { $max: '$updatedAt' }, preview: { $first: '$text' } } },
      { $limit: 30 },
    ]).catch(() => []),
  ]);

  const sources: any[] = [];

  for (const t of trainings as any[]) {
    sources.push({
      _id: String(t._id),
      name: t.title || 'Training Note',
      kind: t.kind === 'file' ? 'pdf' : 'manual',
      topic: 'General',
      owner: t.createdBy || 'Admin',
      status: t.enabled ? 'Published' : 'Draft',
      checkedAt: t.updatedAt,
      chars: (t.content || '').length,
      preview: (t.content || '').slice(0, 160),
    });
  }

  for (const k of knowledgeUrls as any[]) {
    if (!k._id) continue;
    sources.push({
      _id: `web-${k._id}`,
      name: k.title || k._id,
      kind: 'web',
      url: k._id,
      topic: 'General',
      owner: 'Website Crawler',
      status: 'Published',
      checkedAt: k.updatedAt,
      chars: k.chars || 500,
      preview: (k.preview || '').slice(0, 160),
    });
  }

  successResponse(res, sources, 'Sources');
});

// GET /admin/chatbot/review — list unanswered/low-confidence visitor questions for review
export const getReviewQueue = asyncHandler(async (_req: Request, res: Response) => {
  const items = await getReviewQueueItems(100);
  successResponse(res, items, 'Review queue');
});

// POST /admin/chatbot/review/dismiss — { key, undo }
export const dismissReview = asyncHandler(async (req: Request, res: Response) => {
  const key = String(req.body.key || '').trim();
  const undo = Boolean(req.body.undo);
  if (!key) throw new AppError(400, 'key is required');
  await dismissReviewQueueItem(key, undo);
  successResponse(res, null, undo ? 'Review restored' : 'Review dismissed');
});

// POST /admin/chatbot/review/approve — { key, en, hi, reference, topic }
export const approveReview = asyncHandler(async (req: Request, res: Response) => {
  const { key, en, hi, reference } = req.body || {};
  if (!key || (!en && !hi)) {
    throw new AppError(400, 'key and an answer (en or hi) are required');
  }
  await approveReviewQuestion({
    key: String(key),
    en: String(en || hi || ''),
    hi: hi ? String(hi) : undefined,
    reference: reference ? String(reference) : undefined,
    owner: adminName(req),
  });
  successResponse(res, null, 'Answer approved, embedded, and added to knowledge index');
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
