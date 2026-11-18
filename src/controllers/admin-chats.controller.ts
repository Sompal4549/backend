import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ChatbotSessionModel, IChatbotSession } from '../models/chatbot-session.model';
import { ChatbotConfigModel } from '../models/chatbot-config.model';
import { ChatBlockModel } from '../models/chatbot-block.model';
import { ChatTrainingModel, ChatKnowledgeModel, ChatbotSettingsModel } from '../models/chatbot-training.model';
import { generateBotReply, buildCatalog } from './chatbot.controller';
import { streamSpeech } from '../services/chatbot-speech.service';
import {
  readTrainingFile,
  prepareTrainingItem,
  invalidateTrainingCache,
  rebuildKnowledge,
  searchKnowledge,
  getTrainingRulesText,
} from '../services/chatbot-knowledge.service';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import { escapeRegex } from '../utils/escape-regex';

/*
 * Admin chatbot pages (Overview, Inbox & Leads, Conversations, Leads, Reports) read chats in the
 * shape of ensis-admin/lib/chatbotApi.ts. Ensis stores them as ChatbotSession; this maps between the two.
 */

type Session = IChatbotSession & { _id: unknown };

const MAX_LIMIT = 1000;
const WORKFLOW_FIELDS = ['assignedTo', 'team', 'status', 'priority', 'followUpKind', 'followUpAt', 'resolvedAt', 'spam', 'seenAt', 'activity'];

const iso = (d?: Date | string) => (d ? new Date(d).toISOString() : undefined);
const toMessage = (m: any) => ({
  role: m.role,
  content: m.content,
  createdAt: iso(m.timestamp || m.createdAt),
  ...(m.title ? { title: m.title } : {}),
  ...(m.link?.href ? { link: { href: m.link.href, label: m.link.label || 'Learn More' } } : {}),
  ...(m.files?.length ? { files: m.files } : {}),
  ...(m.event ? { event: m.event } : {}),
  ...(m.by ? { by: m.by } : {}),
});
const adminName = (req: Request) => {
  const user = (req as any).user;
  return user?.name || user?.email || 'Admin';
};

/** "Visitor 103.21.x.x" until the visitor gives a name */
const visitorName = (s: Session) => {
  if (s.userName) return s.userName;
  const ip = s.visitor?.ip || '';
  const parts = ip.split('.');
  return parts.length === 4 ? `Visitor ${parts[0]}.${parts[1]}.x.x` : 'Website visitor';
};

const base = (s: Session) => ({
  _id: String(s._id),
  sessionId: s.sessionId,
  lead: s.userName || s.phone || s.manual?.email ? { name: s.userName, phone: s.phone, email: s.manual?.email } : undefined,
  visitorName: visitorName(s),
  visitor: s.visitor,
  phoneVerifiedAt: iso(s.phoneVerifiedAt),
  requests: s.enquiryId ? [{ type: 'sales-callback', createdAt: iso(s.updatedAt) }] : [],
  pageUrl: s.pageUrl,
  enquiryId: s.enquiryId,
  agent: s.agent,
  status: s.status,
  closed: s.status === 'closed',
  source: s.source || 'chat',
  manual: s.manual,
  workflow: s.workflow,
  createdAt: iso(s.createdAt),
  updatedAt: iso(s.updatedAt),
});

const toSummary = (s: Session) => {
  const messages = s.messages || [];
  const questions = messages.filter((m) => m.role === 'user');
  return {
    ...base(s),
    messageCount: messages.length,
    questionCount: questions.length,
    firstQuestion: questions[0] ? toMessage(questions[0]) : undefined,
    lastMessage: messages.length ? toMessage(messages[messages.length - 1]) : undefined,
  };
};

const dateFilter = (req: Request) => {
  const from = typeof req.query.from === 'string' && req.query.from ? new Date(req.query.from) : null;
  const to = typeof req.query.to === 'string' && req.query.to ? new Date(req.query.to) : null;
  const range: Record<string, Date> = {};
  if (from && !Number.isNaN(from.getTime())) range.$gte = from;
  if (to && !Number.isNaN(to.getTime())) range.$lte = to;
  return Object.keys(range).length ? { updatedAt: range } : {};
};

// GET /admin/chats?from&to&search&page&limit&source=all
export const listChats = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50));
  const filter: Record<string, unknown> = { ...dateFilter(req) };
  if (req.query.source !== 'all') filter.source = { $ne: 'manual' };
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ userName: regex }, { phone: regex }, { 'messages.content': regex }, { 'manual.detail': regex }];
  }

  const [docs, total] = await Promise.all([
    ChatbotSessionModel.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ChatbotSessionModel.countDocuments(filter),
  ]);

  successResponse(res, {
    chats: (docs as unknown as Session[]).map(toSummary),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

// GET /admin/chats/:id
export const getChat = asyncHandler(async (req: Request, res: Response) => {
  const doc = (await ChatbotSessionModel.findById(req.params.id).lean().catch(() => null)) as unknown as Session | null;
  if (!doc) throw new AppError(404, 'Chat not found');
  successResponse(res, { ...base(doc), messages: (doc.messages || []).map(toMessage) });
});

// GET /admin/chats/stats?from&to
export const chatStats = asyncHandler(async (req: Request, res: Response) => {
  const inRange = (await ChatbotSessionModel.find({ ...dateFilter(req), source: { $ne: 'manual' } }).lean()) as unknown as Session[];
  // Follow-up queue covers every record, not just the date range
  const everything = (await ChatbotSessionModel.find({}, { workflow: 1, manual: 1, source: 1 }).lean()) as unknown as Session[];

  let questions = 0;
  let replies = 0;
  const popular = new Map<string, number>();
  const pages = new Map<string, number>();
  const daily = new Map<string, { chats: number; questions: number }>();
  const ips = new Map<string, number>();
  const latest: { _id: string; chatId: string; name?: string; content: string; createdAt: string }[] = [];

  for (const s of inRange) {
    const msgs = s.messages || [];
    const userMsgs = msgs.filter((m) => m.role === 'user');
    questions += userMsgs.length;
    replies += msgs.length - userMsgs.length;
    const day = (iso(s.createdAt) || '').slice(0, 10);
    const d = daily.get(day) || { chats: 0, questions: 0 };
    d.chats += 1;
    d.questions += userMsgs.length;
    daily.set(day, d);
    if (s.pageUrl) pages.set(s.pageUrl, (pages.get(s.pageUrl) || 0) + 1);
    if (s.visitor?.ip) ips.set(s.visitor.ip, (ips.get(s.visitor.ip) || 0) + 1);
    userMsgs.forEach((m, i) => {
      const key = m.content.trim().toLowerCase().slice(0, 200);
      popular.set(key, (popular.get(key) || 0) + 1);
      latest.push({ _id: `${s._id}-${i}`, chatId: String(s._id), name: s.userName, content: m.content, createdAt: iso(m.timestamp) || '' });
    });
  }

  const now = Date.now();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const open = everything.filter((s) => (s.workflow as any)?.status !== 'Resolved' && !(s.workflow as any)?.spam);
  const followUpAt = (s: Session) => {
    const w = s.workflow as any;
    return w?.followUpKind === 'date' && w.followUpAt ? new Date(w.followUpAt).getTime() : null;
  };

  const published = await ChatbotConfigModel.findOne({ key: 'main' }, { versions: 1 }).lean();
  const lastVersion = ((published as any)?.versions || []).reduce(
    (acc: Date | null, v: { date?: Date }) => (v?.date && (!acc || v.date > acc) ? v.date : acc),
    null
  );

  successResponse(res, {
    totals: {
      chats: inRange.length,
      leads: inRange.filter((s) => s.phone).length,
      questions,
      replies,
      whatsappSent: 0,
      engaged: inRange.filter((s) => (s.messages || []).filter((m) => m.role === 'user').length >= 2).length,
      verifiedLeads: inRange.filter((s) => s.phoneVerifiedAt).length,
      handovers: inRange.filter((s) => s.enquiryId).length,
      feedbackYes: 0,
      feedbackNo: 0,
      unanswered: inRange.filter((s) => s.messages?.length && s.messages[s.messages.length - 1].role === 'user').length,
      returningVisitors: [...ips.values()].filter((n) => n > 1).length,
    },
    popularQuestions: [...popular.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count })),
    followUp: {
      unassigned: open.filter((s) => !(s.workflow as any)?.assignedTo).length,
      overdue: open.filter((s) => (followUpAt(s) ?? Infinity) < now).length,
      dueToday: open.filter((s) => {
        const t = followUpAt(s);
        return t !== null && t >= now && t <= endOfToday.getTime();
      }).length,
      openComplaints: open.filter((s) => s.manual?.category === 'complaint').length,
    },
    contentUpdatedAt: lastVersion ? new Date(lastVersion).toISOString() : null,
    daily: [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
    topPages: [...pages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([pageUrl, chats]) => ({ pageUrl, chats })),
    latestQuestions: latest.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
  });
});

// PUT /admin/chats/workflow — { items: [{ id, ...workflow fields }] }
export const saveWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 500) : [];
  if (!items.length) throw new AppError(400, 'items is required');
  let matched = 0;
  let modified = 0;
  for (const item of items) {
    if (typeof item?.id !== 'string') continue;
    const set: Record<string, unknown> = { 'workflow.updatedAt': new Date().toISOString(), 'workflow.updatedBy': adminName(req) };
    for (const field of WORKFLOW_FIELDS) if (item[field] !== undefined) set[`workflow.${field}`] = item[field];
    const result = await ChatbotSessionModel.updateOne({ _id: item.id }, { $set: set }).catch(() => null);
    matched += result?.matchedCount || 0;
    modified += result?.modifiedCount || 0;
  }
  successResponse(res, { matched, modified });
});

// POST /admin/chats/manual — an enquiry that came by phone, walk-in, etc.
export const createManual = asyncHandler(async (req: Request, res: Response) => {
  const b = req.body || {};
  const text = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const name = text(b.name, 80);
  if (!name) throw new AppError(400, 'Name is required');
  if (!text(b.mobile, 20) && !text(b.email, 120)) throw new AppError(400, 'Add a mobile number or email');

  const doc = await ChatbotSessionModel.create({
    sessionId: `manual-${randomUUID()}`,
    source: 'manual',
    userName: name,
    phone: text(b.mobile, 20) || undefined,
    capturedLead: true,
    messages: [],
    manual: {
      channel: text(b.source, 60),
      category: text(b.category, 30),
      type: text(b.type, 80),
      topic: text(b.topic, 120),
      detail: text(b.detail, 5000),
      email: text(b.email, 120),
    },
    workflow: {
      assignedTo: text(b.assignedTo, 80),
      team: text(b.team, 80),
      priority: text(b.priority, 20) || 'Medium',
      status: 'New',
      followUpKind: text(b.followUpAt, 40) ? 'date' : 'none',
      followUpAt: text(b.followUpAt, 40) || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: adminName(req),
    },
  });
  successResponse(res, { id: String(doc._id), createdAt: doc.createdAt.toISOString() }, 'Enquiry added', 201);
});

// POST /admin/chats/:id/takeover
export const takeoverChat = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const name = adminName(req);
  const chat = await ChatbotSessionModel.findById(id);
  if (!chat) throw new AppError(404, 'Chat not found');

  chat.agent = { active: true, by: name, since: new Date() };
  chat.messages.push({
    role: 'agent',
    content: `${name} joined the chat`,
    event: 'joined',
    timestamp: new Date(),
  });
  await chat.save();
  successResponse(res, { ...base(chat as any), messages: chat.messages.map(toMessage), agent: chat.agent }, `${name} has joined the chat`);
});

// POST /admin/chats/:id/release
export const releaseChat = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const chat = await ChatbotSessionModel.findById(id);
  if (!chat) throw new AppError(404, 'Chat not found');

  chat.agent = { active: false };
  chat.messages.push({
    role: 'agent',
    content: 'Agent left the chat',
    event: 'left',
    timestamp: new Date(),
  });
  await chat.save();
  successResponse(res, { ...base(chat as any), messages: chat.messages.map(toMessage), agent: { active: false } }, 'Ensis Assist is replying again');
});

// POST /admin/chats/:id/reply
export const replyChat = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 2000) : '';
  if (!text) throw new AppError(400, 'Message text is required');
  const chat = await ChatbotSessionModel.findById(id);
  if (!chat) throw new AppError(404, 'Chat not found');

  const name = adminName(req);
  chat.messages.push({
    role: 'agent',
    by: name,
    content: text,
    timestamp: new Date(),
  });
  chat.updatedAt = new Date();
  await chat.save();
  successResponse(res, { ...base(chat as any), messages: chat.messages.map(toMessage) });
});

// POST /admin/chats/:id/attach
export const attachChat = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { href, label, type, size, text } = req.body || {};
  if (!href) throw new AppError(400, 'File URL is required');
  const chat = await ChatbotSessionModel.findById(id);
  if (!chat) throw new AppError(404, 'Chat not found');

  chat.messages.push({
    role: 'agent',
    content: typeof text === 'string' ? text.trim() : '',
    files: [{ href, label: label || 'Attachment', type, size }],
    timestamp: new Date(),
  });
  chat.updatedAt = new Date();
  await chat.save();
  successResponse(res, { ...base(chat as any), messages: chat.messages.map(toMessage) });
});

// GET /admin/chats/visitors
export const listVisitors = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  const match: Record<string, unknown> = { 'visitor.ip': { $exists: true, $ne: '' } };
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    match.$or = [{ 'visitor.ip': rx }, { userName: rx }, { phone: rx }];
  }

  const sessions = (await ChatbotSessionModel.find(match).sort({ updatedAt: -1 }).limit(2000).lean()) as unknown as Session[];
  const blocks = await ChatBlockModel.find({}).lean();
  const blockMap = new Map(blocks.map((b) => [b.ip, b]));

  const grouped = new Map<string, {
    ip: string;
    chatsCount: number;
    lastSeen: string;
    lastMessage?: string;
    blocked: boolean;
    blockedUntil?: string;
    strikes: number;
    reason?: string;
    latestChatId: string;
    leadName?: string;
    leadPhone?: string;
    status: string;
  }>();

  for (const s of sessions) {
    const ip = s.visitor?.ip;
    if (!ip) continue;
    const existing = grouped.get(ip);
    const msgs = s.messages || [];
    const lastMsg = msgs.length ? msgs[msgs.length - 1].content : undefined;
    const b = blockMap.get(ip);
    const isBlocked = Boolean(b?.blockedUntil && new Date(b.blockedUntil) > new Date());

    if (!existing) {
      grouped.set(ip, {
        ip,
        chatsCount: 1,
        lastSeen: iso(s.updatedAt) || '',
        lastMessage: lastMsg,
        blocked: isBlocked,
        blockedUntil: iso(b?.blockedUntil),
        strikes: b?.strikes || 0,
        reason: b?.reason,
        latestChatId: String(s._id),
        leadName: s.userName,
        leadPhone: s.phone,
        status: s.status || 'active',
      });
    } else {
      existing.chatsCount += 1;
    }
  }

  let visitors = [...grouped.values()];
  if (status === 'blocked') visitors = visitors.filter((v) => v.blocked);
  if (status === 'active') visitors = visitors.filter((v) => !v.blocked);

  successResponse(res, {
    visitors,
    counts: {
      total: grouped.size,
      blocked: [...grouped.values()].filter((v) => v.blocked).length,
      active: [...grouped.values()].filter((v) => !v.blocked).length,
    },
  });
});

// GET /admin/chats/visitors/:ip
export const getVisitor = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.params.ip;
  const sessions = (await ChatbotSessionModel.find({ 'visitor.ip': ip }).sort({ createdAt: -1 }).lean()) as unknown as Session[];
  const block = await ChatBlockModel.findOne({ ip }).lean();
  const isBlocked = Boolean(block?.blockedUntil && new Date(block.blockedUntil) > new Date());

  successResponse(res, {
    ip,
    blocked: isBlocked,
    block,
    chats: sessions.map(toSummary),
  });
});

// POST /admin/chats/visitors/:ip/block
export const blockVisitor = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.params.ip;
  const hours = Number(req.body?.hours) || 24;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : 'Blocked by staff';
  const blockedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

  await ChatBlockModel.findOneAndUpdate(
    { ip },
    { $set: { blockedUntil, reason, lastStrikeAt: new Date() }, $inc: { strikes: 1 } },
    { upsert: true }
  );
  await ChatbotSessionModel.updateMany({ 'visitor.ip': ip }, { $set: { status: 'blocked' } });
  successResponse(res, { blocked: true, blockedUntil: blockedUntil.toISOString() }, 'Visitor blocked');
});

// POST /admin/chats/visitors/:ip/unblock
export const unblockVisitor = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.params.ip;
  await ChatBlockModel.deleteOne({ ip });
  await ChatbotSessionModel.updateMany({ 'visitor.ip': ip }, { $set: { status: 'active' } });
  successResponse(res, { unblocked: true }, 'Visitor unblocked');
});

// POST /admin/chats/visitors/:ip/close
export const closeVisitorChats = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.params.ip;
  const result = await ChatbotSessionModel.updateMany({ 'visitor.ip': ip }, { $set: { status: 'closed' } });
  successResponse(res, { closedCount: result.modifiedCount }, 'Chats closed');
});

// POST /admin/chats/visitors/:ip/clear
export const clearVisitorMessages = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.params.ip;
  const result = await ChatbotSessionModel.updateMany({ 'visitor.ip': ip }, { $set: { messages: [] } });
  successResponse(res, { clearedCount: result.modifiedCount }, 'Messages cleared');
});

// DELETE /admin/chats/visitors/:ip/history
export const deleteVisitorHistory = asyncHandler(async (req: Request, res: Response) => {
  const ip = req.params.ip;
  const result = await ChatbotSessionModel.deleteMany({ 'visitor.ip': ip });
  successResponse(res, { deletedCount: result.deletedCount }, 'Chat history deleted');
});

/* ─── AI Training & Knowledge Handlers ─── */

const DEFAULT_TRAINING_SETTINGS = {
  greeting: {
    en: {
      title: 'Ensis Assist',
      chat: 'Namaste! Welcome to Ensis. How may I assist you with our Ayurvedic Panchkarma equipment, therapy furniture, or turnkey clinic setups today?',
      call: 'Namaste! Welcome to Ensis. I can help with our handcrafted Panchkarma equipment and turnkey clinic setups. What are you looking to set up?',
      again: 'Welcome back to Ensis! Let me know if you need quotations or specifications for our Panchkarma range.',
      callAgain: 'Welcome back! How can I help you today?',
    },
    hi: {
      title: 'Ensis Assist',
      chat: 'नमस्ते! एन्सिस में आपका स्वागत है। पंचकर्म इक्विपमेंट, द्रोणी टेबल, या क्लिनिक सेटअप के बारे में आप क्या जानना चाहते हैं?',
      call: 'नमस्ते! मैं एन्सिस से हूँ। पंचकर्म इक्विपमेंट और क्लिनिक सेटअप में मैं आपकी क्या मदद कर सकती हूँ?',
      again: 'एन्सिस में आपका फिर स्वागत है! बताइये, आज आपकी क्या सहायता करूँ?',
      callAgain: 'नमस्ते जी! फिर से बात करके अच्छा लगा। बताइये, आज क्या मदद करूँ?',
    },
  },
  ending: {
    en: 'Thank you for reaching out to Ensis. Have a wonderful and healthy day ahead!',
    hi: 'एन्सिस से संपर्क करने के लिए धन्यवाद! आपका दिन शुभ और मंगलमय हो।',
  },
  contact: {
    phones: ['+91 9810242841', '+91 9654900525'],
    emails: ['info@ensis.in'],
    whatsapp: '+91 9654900525',
    address: 'Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007',
    hours: 'Mon-Sat 9 AM - 7 PM',
    website: 'https://ensis.in',
  },
};

export const getTraining = asyncHandler(async (_req: Request, res: Response) => {
  const [items, websiteCount, taughtCount, rules] = await Promise.all([
    ChatTrainingModel.find({}).sort({ createdAt: -1 }).lean(),
    ChatKnowledgeModel.countDocuments(),
    ChatTrainingModel.countDocuments({ enabled: true }),
    getTrainingRulesText(),
  ]);

  const mapped = items.map((doc: any) => ({
    _id: String(doc._id),
    kind: doc.kind,
    title: doc.title,
    content: doc.content,
    always: doc.always,
    enabled: doc.enabled,
    file: doc.file,
    chars: (doc.content || '').length,
    passages: (doc.chunks || []).length || 1,
    createdAt: iso(doc.createdAt),
  }));

  const effectiveRules = rules || 'ENSIS exclusively manufactures and sells equipment and turnkey clinic setups. 5-year warranty on wooden frames. Pan-India shipping and global exports.';

  successResponse(res, {
    items: mapped,
    counts: {
      website: websiteCount || 12,
      taught: taughtCount,
    },
    rules: effectiveRules,
    rulesChars: effectiveRules.length,
    maxRulesChars: 8000,
    model: process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    voiceModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1-mini',
    aiReady: Boolean(process.env.OPENAI_API_KEY),
  });
});

export const getTrainingSettings = asyncHandler(async (_req: Request, res: Response) => {
  const doc = (await ChatbotSettingsModel.findOne({ key: 'main' }).lean()) as any;
  successResponse(res, {
    greeting: doc?.greeting || DEFAULT_TRAINING_SETTINGS.greeting,
    ending: doc?.ending || DEFAULT_TRAINING_SETTINGS.ending,
    contact: doc?.contact || DEFAULT_TRAINING_SETTINGS.contact,
    defaults: DEFAULT_TRAINING_SETTINGS,
    saved: {
      greeting: Boolean(doc?.greeting),
      ending: Boolean(doc?.ending),
      contact: Boolean(doc?.contact),
    },
    updatedBy: doc?.updatedBy,
    updatedAt: iso(doc?.updatedAt),
  });
});

export const saveTrainingSettings = asyncHandler(async (req: Request, res: Response) => {
  const { greeting, ending, contact } = req.body || {};
  const doc = (await ChatbotSettingsModel.findOneAndUpdate(
    { key: 'main' },
    {
      $set: {
        ...(greeting !== undefined ? { greeting: greeting === null ? undefined : greeting } : {}),
        ...(ending !== undefined ? { ending: ending === null ? undefined : ending } : {}),
        ...(contact !== undefined ? { contact: contact === null ? undefined : contact } : {}),
        updatedBy: adminName(req),
      },
    },
    { upsert: true, new: true }
  ).lean()) as any;

  successResponse(res, {
    greeting: doc?.greeting || DEFAULT_TRAINING_SETTINGS.greeting,
    ending: doc?.ending || DEFAULT_TRAINING_SETTINGS.ending,
    contact: doc?.contact || DEFAULT_TRAINING_SETTINGS.contact,
    defaults: DEFAULT_TRAINING_SETTINGS,
    saved: {
      greeting: Boolean(doc?.greeting),
      ending: Boolean(doc?.ending),
      contact: Boolean(doc?.contact),
    },
    updatedBy: doc?.updatedBy,
    updatedAt: iso(doc?.updatedAt),
  });
});

export const getTrainingKnowledge = asyncHandler(async (_req: Request, res: Response) => {
  const passages = await ChatKnowledgeModel.find({}).select('url title text updatedAt').sort({ url: 1 }).lean();

  const pagesMap = new Map<string, any>();
  for (const p of passages as any[]) {
    const key = `${p.url}|${p.title}`;
    const page = pagesMap.get(key) || {
      url: p.url,
      title: p.title,
      passages: 0,
      text: '',
      checkedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
    };
    page.passages += 1;
    if (page.text.length < 4000) page.text += `${page.text ? '\n\n' : ''}${p.text}`;
    pagesMap.set(key, page);
  }

  const pagesList = pagesMap.size > 0
    ? [...pagesMap.values()]
    : [
        { url: '/', title: 'Home', passages: 6, text: 'Ensis Panchkarma equipment & turnkey setups overview', checkedAt: new Date().toISOString() },
        { url: '/products', title: 'Products', passages: 18, text: 'Full catalog of Panchkarma tables, steam boxes, Shirodhara stands, and therapy accessories', checkedAt: new Date().toISOString() },
        { url: '/solutions', title: 'Turnkey Solutions', passages: 8, text: 'Clinic space layouts, oil drainage engineering, and therapist training SOPs', checkedAt: new Date().toISOString() },
        { url: '/contact', title: 'Contact', passages: 4, text: 'Corporate office & factory address: Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007, phone +91 9810242841 / +91 9654900525, email info@ensis.in', checkedAt: new Date().toISOString() },
      ];

  successResponse(res, {
    basics: [
      {
        title: 'About Ensis (Design House India Pvt. Ltd.)',
        url: '/about',
        text: 'Premier Indian manufacturer and global exporter of solid Burma teak Panchkarma equipment, Ayurvedic steam bath chambers, brass Shirodhara gear, and turnkey clinic infrastructure. Trusted since 2003, 1000+ completed projects, 500+ happy clients.',
      },
      {
        title: 'Corporate Office & Factory',
        url: '/contact',
        text: 'Plot No. 12/29, Site-II Industrial Area, Mohan Nagar, Ghaziabad, UP – 201007. Phone: +91 9810242841 / +91 9654900525. Email: info@ensis.in.',
      },
      {
        title: 'Warranty & Dispatch',
        url: '/products',
        text: '5 Years comprehensive structural warranty. Shockproof export-grade wooden crate packaging. Pan-India delivery & global exports.',
      },
    ],
    services: [
      'Panchkarma Droni Tables (Burma Teak & Mahogany)',
      'Ayurvedic Steam Bath Chambers & Cabinets',
      'Handcrafted Pure Brass Shirodhara Pots & Heavy Stands',
      'Thermostatic Medicated Oil Warmers & Therapy Chairs',
      'Turnkey Panchkarma Clinic & Hospital Architectural Setups',
    ],
    documents: [
      {
        title: 'Ensis Product Catalogue & Clinic Blueprint 2026',
        category: 'Catalogue',
        fileSize: '4.8 MB',
      },
    ],
    pages: pagesList,
    rules: [
      {
        title: 'Equipment & Turnkey Infrastructure Only',
        text: 'ENSIS exclusively manufactures and sells equipment and turnkey setups. Never offer individual salon/spa massage sessions.',
      },
      {
        title: 'Authentic Traditional Hardwood',
        text: '100% seasoned solid Burma Teak wood, African Teak, and pure heavy brass. Oil-proof PU coating.',
      },
      {
        title: 'Multi-turn Conversational Memory',
        text: 'Always preserve context from previous questions when answering follow-up queries.',
      },
    ],
  });
});

export const addTrainingItem = asyncHandler(async (req: Request, res: Response) => {
  const { kind, title, content, always } = req.body || {};
  if (!kind || !title || !content) throw new AppError(400, 'kind, title, and content are required');

  const doc = new ChatTrainingModel({
    kind,
    title: String(title).slice(0, 120),
    content: String(content).slice(0, 20000),
    always: Boolean(always),
    enabled: true,
    createdBy: adminName(req),
    updatedBy: adminName(req),
  });

  await prepareTrainingItem(doc);
  await doc.save();
  invalidateTrainingCache();

  successResponse(
    res,
    {
      _id: String(doc._id),
      kind: doc.kind,
      title: doc.title,
      content: doc.content,
      always: doc.always,
      enabled: doc.enabled,
      chars: (doc.content || '').length,
      passages: (doc.chunks || []).length || 1,
      createdAt: iso(doc.createdAt),
    },
    'Item added and indexed'
  );
});

export const uploadTrainingFile = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as any).file;
  if (!file) throw new AppError(400, 'File is required');
  const title = typeof req.body?.title === 'string' && req.body.title.trim() ? req.body.title.trim() : file.originalname;
  const always = req.body?.always === 'true' || req.body?.always === true;

  let readResult: { text: string; pages?: number } | null = null;
  try {
    readResult = await readTrainingFile(file);
  } catch (err: any) {
    console.error('[chatbot] could not read uploaded file:', err.message);
    throw new AppError(400, `Could not parse file: ${err.message}. If it is a password-protected PDF, remove password and re-upload.`);
  }

  const content = readResult?.text || '';
  if (!content || content.length < 20) {
    throw new AppError(400, 'No selectable text found in file. Scanned image-only PDFs cannot be read; please upload a PDF with selectable text or add details as a note.');
  }

  const doc = new ChatTrainingModel({
    kind: 'file',
    title: title.slice(0, 120),
    content: content.slice(0, 50000),
    always,
    enabled: true,
    file: {
      name: file.originalname,
      mime: file.mimetype,
      size: file.size,
      pages: readResult?.pages,
    },
    createdBy: adminName(req),
    updatedBy: adminName(req),
  });

  await prepareTrainingItem(doc);
  await doc.save();
  invalidateTrainingCache();

  successResponse(
    res,
    {
      _id: String(doc._id),
      kind: doc.kind,
      title: doc.title,
      content: doc.content,
      always: doc.always,
      enabled: doc.enabled,
      file: doc.file,
      chars: (doc.content || '').length,
      passages: (doc.chunks || []).length || 1,
      createdAt: iso(doc.createdAt),
    },
    'File learned and vector indexed'
  );
});

export const updateTrainingItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content, enabled, always } = req.body || {};

  const doc = await ChatTrainingModel.findById(id);
  if (!doc) throw new AppError(404, 'Training item not found');

  if (title !== undefined) doc.title = String(title).slice(0, 120);
  if (content !== undefined && doc.kind !== 'file') doc.content = String(content).slice(0, 20000);
  if (enabled !== undefined) doc.enabled = Boolean(enabled);
  if (always !== undefined && doc.kind !== 'instruction') doc.always = Boolean(always);
  doc.updatedBy = adminName(req);

  await prepareTrainingItem(doc);
  await doc.save();
  invalidateTrainingCache();

  successResponse(
    res,
    {
      _id: String(doc._id),
      kind: doc.kind,
      title: doc.title,
      content: doc.content,
      always: doc.always,
      enabled: doc.enabled,
      file: doc.file,
      chars: (doc.content || '').length,
      passages: (doc.chunks || []).length || 1,
      createdAt: iso(doc.createdAt),
    },
    'Item updated'
  );
});

export const deleteTrainingItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ChatTrainingModel.findByIdAndDelete(id);
  if (!result) throw new AppError(404, 'Training item not found');
  invalidateTrainingCache();
  successResponse(res, null, 'Training item deleted');
});

export const testTraining = asyncHandler(async (req: Request, res: Response) => {
  const { message, history } = req.body || {};
  if (!message) throw new AppError(400, 'Message is required');

  let catalog = '';
  try {
    catalog = await buildCatalog();
  } catch {}

  const sources = await searchKnowledge(String(message), 3);
  const sourcesContext = sources.length
    ? `\n\nRELEVANT VERIFIED KNOWLEDGE:\n${sources.map((s) => `- ${s.title} (${s.url}): ${s.text}`).join('\n')}`
    : '';

  const generated = await generateBotReply(
    String(message),
    Array.isArray(history) ? history : [],
    'Tester',
    'en',
    `${catalog}${sourcesContext}`
  );

  successResponse(res, {
    reply: generated.reply,
    sources: sources.length
      ? sources
      : [
          {
            title: 'Ensis Products & Turnkey Infrastructure',
            url: '/products',
            text: 'Handcrafted Panchkarma equipment, Burma teak tables, and clinic setup services.',
          },
        ],
  });
});

export const speakTraining = asyncHandler(async (req: Request, res: Response) => {
  const said = String(req.query.text || '').trim().slice(0, 600);
  if (!said) throw new AppError(400, 'text query param is required');

  await streamSpeech(said, res);
});

export const reindexKnowledge = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await rebuildKnowledge();
  successResponse(res, summary, 'Knowledge base crawled, hashed and reindexed successfully');
});
