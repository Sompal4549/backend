import { Request, Response } from 'express';
import { FaqModel } from '../models/faq.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { AuthRequest } from '../middlewares/auth.middleware';

const EDITABLE_FIELDS = [
  'question',
  'answer',
  'shortAnswer',
  'category',
  'status',
  'visibility',
  'isFeatured',
  'orderBy',
] as const;

// Only known fields are written; views/votes are never set from the admin form
const pickEditable = (body: Record<string, unknown>) => {
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  return data;
};

const editorName = (req: AuthRequest) => (req.user as { name?: string } | undefined)?.name || '';

// Website list: published public FAQs, lowest display order first (0 goes last)
export const getPublicFaqs = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const faqs = await FaqModel.aggregate([
    { $match: { status: 'Published', visibility: 'Public' } },
    { $addFields: { sortOrder: { $cond: [{ $gt: ['$orderBy', 0] }, '$orderBy', Number.MAX_SAFE_INTEGER] } } },
    { $sort: { isFeatured: -1, sortOrder: 1, createdAt: 1 } },
    { $limit: limit },
    { $project: { question: 1, answer: 1, shortAnswer: 1, category: 1, isFeatured: 1 } },
  ]);
  successResponse(res, faqs, 'FAQs retrieved');
});

export const getAllFaqsAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const faqs = await FaqModel.find().sort({ orderBy: 1, createdAt: 1 });
  successResponse(res, faqs, 'FAQs retrieved');
});

export const getFaqById = asyncHandler(async (req: Request, res: Response) => {
  const faq = await FaqModel.findById(req.params.id);
  if (!faq) throw new AppError(404, 'FAQ not found');
  successResponse(res, faq, 'FAQ retrieved');
});

export const createFaq = asyncHandler(async (req: AuthRequest, res: Response) => {
  const faq = await FaqModel.create({ ...pickEditable(req.body), updatedBy: editorName(req) });
  successResponse(res, faq, 'FAQ created', 201);
});

export const updateFaq = asyncHandler(async (req: AuthRequest, res: Response) => {
  const faq = await FaqModel.findByIdAndUpdate(
    req.params.id,
    { ...pickEditable(req.body), updatedBy: editorName(req) },
    { new: true, runValidators: true }
  );
  if (!faq) throw new AppError(404, 'FAQ not found');
  successResponse(res, faq, 'FAQ updated');
});

export const deleteFaq = asyncHandler(async (req: Request, res: Response) => {
  const faq = await FaqModel.findByIdAndDelete(req.params.id);
  if (!faq) throw new AppError(404, 'FAQ not found');
  successResponse(res, null, 'FAQ deleted');
});
