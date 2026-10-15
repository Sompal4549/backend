import { Request, Response } from 'express';
import { ChatbotSessionModel } from '../models/chatbot-session.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';

const ENSIS_SYSTEM_PROMPT = `You are the Senior Wellness & Technical Space Advisor for "Ensis" (ensis.in).
Ensis is India's premier manufacturer and turnkey architect of Ayurvedic, Panchkarma, Spa & Wellness spaces.

Company Core Strengths & Offerings:
1. Solid Burma Teak Handcrafted Droni (Treatment tables), Motorized & Hydraulic Panchkarma tables with medical-grade oil resistance.
2. Precision Shirodhara stands, brass & copper vessels with automated temperature and flow controls.
3. Swedana Steam Chambers (handcrafted cedar wood and fiber models).
4. Turnkey Ayurvedic Clinic & Wellness Resort setups (Space planning, 2D/3D layouts, NABH compliance, complete interior, 30-45 day delivery).
5. Doctor & Vaidya clinical setup consultancy (SOPs, therapist training, space sizing).
6. Warranty & Shipping: 5-Year Structural Warranty, Pan-India & Global shipping with on-site installation by Ensis engineers.
7. Helpline & Contact: Phone/WhatsApp +91 9654900525 | Email: support@ensis.in

Guidelines:
- Tone: Warm, prestigious, knowledgeable, respectful (use "Namaste", "Vaidya ji", or polite professional tone).
- Languages: Answer naturally in the language user asks (Hindi, English, or Hinglish).
- Keep answers structured, practical, and concise (2-4 paragraphs max).
- If the user asks for pricing, custom layout estimation, or quotation, invite them to share their contact details for a free customized 2D layout and 2026 architecture catalog.`;

async function generateBotReply(
  userMessage: string,
  history: Array<{ role: string; content: string }> = [],
  userName?: string,
  language?: string
): Promise<{ reply: string; provider: string }> {
  const nameInstruction = userName ? `\nClient Name: "${userName}". Greet or address them respectfully by name (e.g., "${userName} ji" or "Dr. ${userName}").` : '';
  const langInstruction = language === 'hi'
    ? '\nLanguage Instruction: The user has chosen Hindi language mode. Please reply entirely in polite, respectful, and polished Hindi (Devanagari script) using appropriate Ayurvedic terms.'
    : '';
  const dynamicSystemPrompt = `${ENSIS_SYSTEM_PROMPT}${nameInstruction}${langInstruction}`;

  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    try {
      const openAiMessages = [
        { role: 'system', content: dynamicSystemPrompt },
        ...history.map((h) => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: String(h.content || ''),
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openAiMessages,
          temperature: 0.7,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(6000),
      });

      const data: any = await response.json();
      if (response.ok && data?.choices?.[0]?.message?.content) {
        return { reply: data.choices[0].message.content, provider: 'openai' };
      }
    } catch {
      // Fall through to Gemini
    }
  }

  if (geminiKey) {
    try {
      const contents: any[] = [];
      for (const item of history.slice(-6)) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(item.content || '') }],
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: `${dynamicSystemPrompt}\n\nUser Question: ${userMessage}` }],
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
          signal: AbortSignal.timeout(6000),
        }
      );

      const data: any = await response.json();
      if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return { reply: data.candidates[0].content.parts[0].text, provider: 'gemini' };
      }
    } catch {
      // Fall through to fallback
    }
  }

  const fallbackReply =
    "Namaste! Ensis specializes in Turnkey Panchkarma setups, Handcrafted Solid Teak Droni, Automated Shirodhara units, and Ayurvedic clinic consultancy.\n\nFor a customized 2D layout and 2026 catalog, please contact our team directly at +91 9654900525 or leave your phone number.";

  return { reply: fallbackReply, provider: 'fallback' };
}

export const postChatbotMessage = asyncHandler(async (req: Request, res: Response) => {
  const { message, history, userName, language, sessionId } = req.body;
  const userMessage = typeof message === 'string' ? message.trim() : '';

  if (!userMessage) {
    const greeting = language === 'hi'
      ? (userName ? `नमस्ते ${userName} जी! आज मैं आपकी क्या सहायता कर सकता हूँ?` : "नमो नमः! आज मैं आपके आयुर्वेदिक क्लिनिक या पंचकर्म सेटअप में क्या सहायता कर सकता हूँ?")
      : (userName ? `Namaste ${userName} ji! How may I assist you today?` : "Namaste! How may I assist you with your Ayurvedic clinic, wellness center, or Panchkarma equipment setup today?");

    return successResponse(res, { reply: greeting });
  }

  const { reply, provider } = await generateBotReply(userMessage, history, userName, language);

  if (sessionId) {
    try {
      await ChatbotSessionModel.findOneAndUpdate(
        { sessionId },
        {
          $push: {
            messages: {
              $each: [
                { role: 'user', content: userMessage, timestamp: new Date() },
                { role: 'assistant', content: reply, timestamp: new Date() },
              ],
            },
          },
          $set: {
            ...(userName ? { userName } : {}),
            capturedLead: true,
          },
        },
        { new: true, upsert: true, runValidators: true }
      );
    } catch (err) {
      console.error('Failed to persist chat session:', err);
    }
  }

  successResponse(res, { reply, provider });
});

export const getConversationsHandler = asyncHandler(async (req: Request, res: Response) => {
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

export const getStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
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