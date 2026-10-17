import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ChatbotSessionModel, IChatbotSession } from '../models/chatbot-session.model';
import { ChatbotConfigModel } from '../models/chatbot-config.model';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';

/*
 * Admin chatbot pages (Overview, Inbox & Leads, Conversations, Leads, Reports) read chats in the
 * shape of ensis-admin/lib/chatbotApi.ts. Ensis stores them as ChatbotSession; this maps between the two.
 */

type Session = IChatbotSession & { _id: unknown };

const MAX_LIMIT = 1000;
const WORKFLOW_FIELDS = ['assignedTo', 'team', 'status', 'priority', 'followUpKind', 'followUpAt', 'resolvedAt', 'spam', 'seenAt', 'activity'];

const iso = (d?: Date | string) => (d ? new Date(d).toISOString() : undefined);
const toMessage = (m: { role: string; content: string; timestamp?: Date }) => ({ role: m.role, content: m.content, createdAt: iso(m.timestamp) });
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

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
