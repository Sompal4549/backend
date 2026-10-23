import { Request, Response } from 'express';
import { ChatbotSessionModel } from '../models/chatbot-session.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { EnquiryModel } from '../models/enquiry.model';
import { sendPhoneOtp, verifyPhoneOtp } from '../services/verifyService';
import { getPublishedConfigService } from '../services/chatbot-manager.service';
import { ProductModel } from '../models/product.model';
import { CategoryModel } from '../models/category.model';
import { SolutionModel } from '../models/solution.model';

const ENSIS_SYSTEM_PROMPT = `You are "Ensis Advisor", the sales assistant on the ENSIS website (ensis.in).
ENSIS (Design House India Pvt. Ltd., Ghaziabad) manufactures handcrafted Ayurvedic, Panchkarma and spa equipment and delivers turnkey Ayurveda clinics, hospitals, spas and wellness resorts across India and abroad.
Facts: 5-year structural warranty on equipment; pan-India and international shipping with on-site installation; turnkey projects cover space planning, 2D/3D layouts, interiors, equipment, SOPs and therapist training. Phone/WhatsApp +91 9654900525, email info@ensis.in, Mon-Sat 9 AM-7 PM.

Your goal: help the visitor find the right product or solution, and turn real interest into a callback request (a lead) for the sales team.

How to answer:
- Product questions: recommend 1-3 matching items from the PRODUCT CATALOG below. For each give the exact name, the price from the catalog (e.g. "₹72,000 + GST") and one key spec, with its link in markdown, e.g. [Premium Teak Wood Droni Table](/products/premium-teak-wood-ayurvedic-droni-table).
- Setup or project questions (clinic, hospital, spa, resort, Panchkarma centre): use the SOLUTIONS list and link the matching page.
- Only use the products, prices and facts given here. Never invent a product, price, size or delivery date. If something is not listed, say the team will confirm it on a call.
- Understand the need: when it helps, ask ONE short question at a time, e.g. what they are setting up, in which city, how many therapy rooms, or when they plan to start.
- Lead: when the visitor shows buying interest (asks for a price, quote, catalog, customisation, bulk order, delivery to their city, site visit, layout or a setup), or after 3 helpful replies, invite them to request a free callback from an ENSIS expert and put the exact tag [[LEAD]] at the very end of that reply. The website then shows a callback form. Never ask them to type their phone number in the chat. Do not add [[LEAD]] in two replies in a row.

Style:
- Reply in the visitor's language (English, Hindi or Hinglish).
- Short chat messages: at most 80 words, 2-4 sentences or up to 3 one-line bullets. No headings.
- Do not start with "Namaste", the visitor's name or an introduction of ENSIS; greet only if they greet you. Go straight to the answer.
- Warm, confident and helpful, like a good showroom advisor. End with one short question or next step.`;

/** Replies longer than this are cut back to the last full sentence within it */
const MAX_REPLY_WORDS = 80;

/** Keeps a reply within MAX_REPLY_WORDS, ending on a complete sentence where possible */
export const limitWords = (text: string, max = MAX_REPLY_WORDS): string => {
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  // Re-join on the original spacing so paragraphs and bullet lines survive the cut
  const parts = text.trim().split(/(\s+)/);
  let count = 0;
  let cut = "";
  for (const part of parts) {
    if (!/^\s+$/.test(part) && ++count > max) break;
    cut += part;
  }
  // Last sentence end (. ! ? or the Hindi danda) in the cut text
  const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"), cut.lastIndexOf("।"));
  return end > cut.length * 0.6 ? cut.slice(0, end + 1).trim() : `${cut.trim()}…`;
};

// AI providers can take well over 6s for a full prompt; a shorter limit made every reply the fallback.
const AI_TIMEOUT_MS = 20000;

const plainText = (value: unknown): string =>
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** "PREMIUM TEAK WOOD DRONI" → "Premium Teak Wood Droni" (admin titles are often all caps) */
const titleCase = (value: string): string =>
  value === value.toUpperCase() ? value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : value;

const rupees = (n: number): string => `₹${Math.round(n).toLocaleString('en-IN')}`;

const CATALOG_TTL_MS = 10 * 60 * 1000;
let catalogCache: { text: string; at: number } | null = null;

/** Active products and solutions, so the AI answers with real names, prices and links (cached 10 min) */
export const buildCatalog = async (): Promise<string> => {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.text;

  const [products, categories, solutions] = await Promise.all([
    ProductModel.find({ isActive: true })
      .select('title slug price discountPrice material shortDescription category gstRate')
      .sort({ orderBy: 1, createdAt: -1 })
      .limit(150)
      .lean(),
    CategoryModel.find({}).select('name').lean(),
    SolutionModel.find({ isActive: true }).select('title slug hero').sort({ orderBy: 1 }).lean(),
  ]);
  const categoryName = new Map((categories as any[]).map((c) => [String(c._id), plainText(c.name)]));

  const byCategory = new Map<string, string[]>();
  for (const p of products as any[]) {
    if (!p.slug) continue;
    const hasDiscount = p.discountPrice > 0 && p.discountPrice < p.price;
    const price = hasDiscount
      ? `${rupees(p.discountPrice)} (MRP ${rupees(p.price)})`
      : p.price > 0
        ? rupees(p.price)
        : 'price on request';
    const gst = p.price > 0 ? (p.gstRate ? ` + ${p.gstRate}% GST` : ' + GST') : '';
    const material = plainText(p.material).slice(0, 60);
    const detail = plainText(p.shortDescription).slice(0, 170);
    const line = [`- ${titleCase(plainText(p.title))}`, `${price}${gst}`, material, `/products/${p.slug}`, detail]
      .filter(Boolean)
      .join(' | ');
    const category = categoryName.get(String(p.category)) || 'Other';
    byCategory.set(category, [...(byCategory.get(category) || []), line]);
  }

  const productText = [...byCategory.entries()].map(([category, lines]) => `${category}:\n${lines.join('\n')}`).join('\n');
  const solutionText = (solutions as any[])
    .filter((x) => x.slug)
    .map((x) => `- ${plainText(x.title)} | /solutions/${x.slug} | ${plainText(x.hero?.description).slice(0, 180)}`)
    .join('\n');

  const text =
    (productText ? `\n\nPRODUCT CATALOG (name | price | material | link | details):\n${productText}` : '') +
    (solutionText ? `\n\nSOLUTIONS (turnkey setups):\n${solutionText}` : '');
  catalogCache = { text, at: Date.now() };
  return text;
};

type ManagerAnswer = { question?: string; status?: string; phrases?: string[]; answer?: { en?: string; hi?: string } };

/** "Approved" answers from the Chatbot Manager, given to the AI as verified facts. */
export const buildKnowledge = (config: any): string => {
  const answers: ManagerAnswer[] = Array.isArray(config?.answers) ? config.answers : [];
  const lines = answers
    .filter((a) => a?.status === 'Approved' && a.question?.trim() && a.answer?.en?.trim())
    .slice(0, 100)
    .map((a) => {
      const phrases = (a.phrases || []).filter(Boolean).join(' | ');
      const hindi = a.answer?.hi?.trim() ? `\n   (Hindi/Hinglish: ${a.answer.hi.trim()})` : '';
      return `- Q: ${a.question!.trim()}${phrases ? ` [also asked as: ${phrases}]` : ''}\n   A: ${a.answer!.en!.trim()}${hindi}`;
    });
  return lines.length
    ? `\n\nVerified answers approved by the Ensis team (always prefer these over your own knowledge):\n${lines.join('\n')}`
    : '';
};

export async function generateBotReply(
  userMessage: string,
  history: Array<{ role: string; content: string }> = [],
  userName?: string,
  language?: string,
  knowledge = ''
): Promise<{ reply: string; provider: string }> {
  const nameInstruction = userName ? `\nClient Name: "${userName}". You may address them as "${userName} ji" now and then, but not at the start of every reply.` : '';
  const langInstruction = language === 'hi'
    ? '\nLanguage Instruction: The user has chosen Hindi language mode. Please reply entirely in polite, respectful, and polished Hindi (Devanagari script) using appropriate Ayurvedic terms.'
    : '';
  const dynamicSystemPrompt = `${ENSIS_SYSTEM_PROMPT}${knowledge}${nameInstruction}${langInstruction}`;

  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    try {
      const openAiMessages = [
        { role: 'system', content: dynamicSystemPrompt },
        ...history.slice(-10).map((h) => ({
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
          temperature: 0.4,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });

      const data: any = await response.json();
      if (response.ok && data?.choices?.[0]?.message?.content) {
        return { reply: limitWords(data.choices[0].message.content), provider: 'openai' };
      }
    } catch {
      // Fall through to the fallback reply
    }
  }

  const fallbackReply =
    "Namaste! Ensis specializes in Turnkey Panchkarma setups, Handcrafted Solid Teak Droni, Automated Shirodhara units, and Ayurvedic clinic consultancy.\n\nFor a customized 2D layout and 2026 catalog, please contact our team directly at +91 9654900525 or leave your phone number.";

  return { reply: fallbackReply, provider: 'fallback' };
}

/** Widget-generated session id; anything else is not stored */
const validSessionId = (value: unknown): string | null =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value) ? value : null;

const pageUrlOf = (value: unknown): string => (typeof value === 'string' ? value.trim().slice(0, 300) : '');

const visitorOf = (req: Request) => ({
  ip: String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().slice(0, 60),
  userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
});

export const postChatbotMessage = asyncHandler(async (req: Request, res: Response) => {
  const { message, history, userName, language, sessionId } = req.body;
  const userMessage = typeof message === 'string' ? message.trim() : '';

  if (!userMessage) {
    const greeting = language === 'hi'
      ? (userName ? `नमस्ते ${userName} जी! आज मैं आपकी क्या सहायता कर सकता हूँ?` : "नमो नमः! आज मैं आपके आयुर्वेदिक क्लिनिक या पंचकर्म सेटअप में क्या सहायता कर सकता हूँ?")
      : (userName ? `Namaste ${userName} ji! How may I assist you today?` : "Namaste! How may I assist you with your Ayurvedic clinic, wellness center, or Panchkarma equipment setup today?");

    return successResponse(res, { reply: greeting });
  }

  let knowledge = '';
  try {
    knowledge = buildKnowledge(await getPublishedConfigService());
  } catch (err) {
    console.error('Failed to load published chatbot answers:', err);
  }

  try {
    knowledge += await buildCatalog();
  } catch (err) {
    console.error('Failed to load the product catalog for the chatbot:', err);
  }

  const generated = await generateBotReply(userMessage, Array.isArray(history) ? history : [], userName, language, knowledge);
  const provider = generated.provider;
  // [[LEAD]] = the AI is inviting a callback; the widget then shows the callback form
  const showLeadForm = /\[\[\s*LEAD\s*\]\]/i.test(generated.reply);
  const reply = generated.reply.replace(/\s*\[\[\s*LEAD\s*\]\]\s*/gi, ' ').trim();

  const session = validSessionId(sessionId);
  if (session) {
    try {
      const name = typeof userName === 'string' ? userName.trim().slice(0, 80) : '';
      await ChatbotSessionModel.findOneAndUpdate(
        { sessionId: session },
        {
          $push: {
            messages: {
              $each: [
                { role: 'user', content: userMessage.slice(0, 4000), timestamp: new Date() },
                { role: 'assistant', content: reply, timestamp: new Date() },
              ],
            },
          },
          $set: {
            ...(name ? { userName: name } : {}),
            ...(pageUrlOf(req.body.pageUrl) ? { pageUrl: pageUrlOf(req.body.pageUrl) } : {}),
          },
          $setOnInsert: { source: 'chat', visitor: visitorOf(req) },
        },
        { new: true, upsert: true, runValidators: true }
      );
    } catch (err) {
      console.error('Failed to persist chat session:', err);
    }
  }

  successResponse(res, { reply, provider, showLeadForm });
});

/** Name and mobile from the chat's callback form; throws a 400 the widget can show */
const leadContact = (body: any) => {
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 20) : '';
  const digits = phone.replace(/\D/g, '');
  if (!name) throw new AppError(400, 'Please enter your name.');
  if (digits.length < 10 || digits.length > 13) throw new AppError(400, 'Please enter a valid mobile number.');
  return { name, phone };
};

// POST /chatbot/lead/otp — { name, phone }: sends the WhatsApp OTP for the callback form
export const postChatbotLeadOtp = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone } = leadContact(req.body);
  await sendPhoneOtp(phone, 'CONTACT', name);
  successResponse(res, { sent: true }, 'OTP sent on WhatsApp');
});

// POST /chatbot/lead — { sessionId, name, phone, otp, language, pageUrl }: the chat's callback form.
// Saves the lead on the chat and adds it to Website Enquiries (source "chatbot").
export const postChatbotLead = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone } = leadContact(req.body);
  const otp = typeof req.body.otp === 'string' ? req.body.otp.trim() : '';
  if (!/^\d{4,8}$/.test(otp)) throw new AppError(400, 'Please enter the OTP sent on WhatsApp.');
  // Throws "Invalid or expired OTP" (400) and uses the code up
  await verifyPhoneOtp(phone, otp);
  const verifiedAt = new Date();

  const session = validSessionId(req.body.sessionId);
  const chat = session ? await ChatbotSessionModel.findOne({ sessionId: session }).lean() : null;
  const questions = (chat?.messages || [])
    .filter((m) => m.role === 'user')
    .slice(-5)
    .map((m) => `• ${m.content}`)
    .join('\n');

  const enquiry = await EnquiryModel.create({
    fullName: name,
    mobileNumber: phone,
    email: '',
    projectType: 'Chatbot Callback Request',
    message: questions
      ? `Callback requested from the website chatbot (mobile verified on WhatsApp). Questions asked:\n${questions}`
      : 'Callback requested from the website chatbot (mobile verified on WhatsApp).',
    preferredContact: 'Phone',
    agreeToContact: true,
    source: 'chatbot',
  });

  if (session) {
    await ChatbotSessionModel.findOneAndUpdate(
      { sessionId: session },
      {
        $set: {
          userName: name,
          phone,
          capturedLead: true,
          phoneVerifiedAt: verifiedAt,
          enquiryId: String(enquiry._id),
          ...(pageUrlOf(req.body.pageUrl) ? { pageUrl: pageUrlOf(req.body.pageUrl) } : {}),
        },
        $setOnInsert: { source: 'chat', visitor: visitorOf(req) },
      },
      { upsert: true, runValidators: true }
    );
  }

  successResponse(res, { enquiryId: String(enquiry._id) }, 'Callback request received', 201);
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