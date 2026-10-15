import { Request, Response } from 'express';
import { ChatbotSessionModel } from '../models/chatbot-session.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';

function extractPhone(message: string): string | undefined {
  const match = message.match(/(?:\+91\s?)?[6789]\d{9}/);
  return match ? match[0].replace(/\s+/g, '') : undefined;
}

function isLeadCaptureAttempt(message: string): boolean {
  const keywords = ['contact', 'call', 'phone', 'whatsapp', 'email', 'price', 'quote', 'quotation', 'layout', 'catalog', 'visit', 'demo'];
  const lower = message.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export const persistChatMessage = async (sessionId: string, userMessage: string, assistantReply: string, userName?: string, phone?: string) => {
  const userPhone = phone || extractPhone(userMessage);
  const isLead = isLeadCaptureAttempt(userMessage);
  const capturedLead = Boolean(userPhone || userName) && isLead;

  const session = await ChatbotSessionModel.findOneAndUpdate(
    { sessionId },
    {
      $push: {
        messages: {
          $each: [
            { role: 'user', content: userMessage, timestamp: new Date() },
            { role: 'assistant', content: assistantReply, timestamp: new Date() },
          ],
        },
      },
      $set: {
        ...(userName ? { userName } : {}),
        ...(userPhone ? { phone: userPhone } : {}),
        capturedLead,
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return session;
};

export const getChatbotStats = asyncHandler(async (_req: Request, res: Response) => {
  const totalSessions = await ChatbotSessionModel.countDocuments();
  const capturedLeads = await ChatbotSessionModel.countDocuments({ capturedLead: true });
  const totalMessagesResult = await ChatbotSessionModel.aggregate([
    { $project: { count: { $size: '$messages' } } },
    { $group: { _id: null, total: { $sum: '$count' } } },
  ]);

  const totalMessages = totalMessagesResult[0]?.total || 0;

  const avgDuration = await ChatbotSessionModel.aggregate([
    {
      $project: {
        duration: {
          $subtract: [
            { $ifNull: ['$updatedAt', '$createdAt'] },
            { $ifNull: ['$createdAt', new Date(0)] },
          ],
        },
      },
    },
    { $group: { _id: null, avg: { $avg: '$duration' } } },
  ]);

  const avgMs = avgDuration[0]?.avg || 0;
  const avgMinutes = Math.round(avgMs / 60000);

  const topQueries = await ChatbotSessionModel.aggregate([
    { $unwind: '$messages' },
    { $match: { 'messages.role': 'user' } },
    { $group: { _id: '$messages.content', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);

  successResponse(res, {
    totalSessions,
    capturedLeads,
    totalMessages,
    avgSessionDurationMinutes: avgMinutes,
    topQueries: topQueries.map((q) => ({ query: q._id, count: q.count })),
  });
});

export const getConversations = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;

  const [sessions, total] = await Promise.all([
    ChatbotSessionModel.find()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ChatbotSessionModel.countDocuments(),
  ]);

  successResponse(res, {
    sessions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});