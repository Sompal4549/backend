import { Request, Response } from 'express';
import { GbpConnectionModel, GbpReviewModel, IGbpReview } from '../models/gbp.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { escapeRegex } from '../utils/escape-regex';

/**
 * Google Business Profile (admin "Google Reviews" page).
 *
 * Status: storage scaffold only. The Google OAuth sign-in, review sync and reply calls are not
 * implemented yet (they need a Google Cloud OAuth client and Business Profile API access).
 * Every endpoint answers honestly: no connection -> "not connected" + empty lists, and actions
 * that would need Google return 503 (not configured) or 501 (not implemented). No sample data.
 */

const NOT_CONFIGURED_MESSAGE = 'Google Business integration is not configured on the server.';
const NOT_IMPLEMENTED_MESSAGE =
  'Google Business sign-in and review sync are not implemented on this server yet.';
const NEW_REVIEW_DAYS = 7;
const NEGATIVE_MAX_RATING = 2;

const REQUIRED_ENV = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GBP_REDIRECT_URI', 'ENCRYPTION_MASTER_KEY'] as const;

const isConfigured = () => REQUIRED_ENV.every((key) => Boolean(process.env[key]?.trim()));

const assertConfigured = () => {
  if (!isConfigured()) throw new AppError(503, NOT_CONFIGURED_MESSAGE);
};

/** The stored connection, only when the server is configured and a refresh token was saved */
const getActiveConnection = async () => {
  if (!isConfigured()) return null;
  const connection = await GbpConnectionModel.findOne().select('+refreshTokenEnc').sort({ updatedAt: -1 });
  return connection && connection.refreshTokenEnc ? connection : null;
};

const emptyDashboard = () => ({
  metrics: { overallRating: 0, totalReviews: 0, newReviews: 0, pendingReplies: 0 },
  tabCounts: { all: 0, new: 0, pending: 0, replied: 0, negative: 0 },
  ratingBreakdown: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, percentage: 0 })),
  trend: [] as { label: string; averageRating: number; count: number }[],
  byLocation: [] as { locationId: string; name: string; averageRating: number; totalReviews: number }[],
  negativeReviews: [] as unknown[],
  lastSyncedAt: null as string | null,
});

const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);
const round1 = (n: number) => Math.round(n * 10) / 10;
const average = (list: IGbpReview[]) => (list.length ? round1(list.reduce((s, r) => s + r.rating, 0) / list.length) : 0);
const isNew = (r: IGbpReview) => Date.now() - new Date(r.createTime).getTime() <= NEW_REVIEW_DAYS * 86400000;

const toRow = (r: IGbpReview) => ({
  id: String(r._id),
  googleReviewId: r.googleReviewId,
  reviewerName: r.reviewerName,
  reviewerPhoto: r.reviewerPhoto ?? null,
  rating: r.rating,
  comment: r.comment,
  locationId: r.locationId,
  locationName: r.locationName,
  createTime: iso(r.createTime) as string,
  updateTime: iso(r.updateTime) as string,
  replyComment: r.replyComment ?? null,
  replyUpdateTime: iso(r.replyUpdateTime),
  replyStatus: r.replyComment ? ('replied' as const) : ('pending' as const),
  lastSyncedAt: iso(r.lastSyncedAt) as string,
});

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Filters shared by the list and the CSV export (locationId, rating, tab, search) */
const reviewFilter = (query: Request['query']) => {
  const filter: Record<string, unknown> = {};
  const locationId = str(query.locationId);
  if (locationId && locationId !== 'all') filter.locationId = locationId;
  const rating = Number(query.rating);
  if (rating >= 1 && rating <= 5) filter.rating = rating;
  switch (str(query.tab) || str(query.status)) {
    case 'new':
      filter.createTime = { $gte: new Date(Date.now() - NEW_REVIEW_DAYS * 86400000) };
      break;
    case 'pending':
      filter.replyComment = { $in: [null, ''] };
      break;
    case 'replied':
      filter.replyComment = { $nin: [null, ''] };
      break;
    case 'negative':
      filter.rating = { $lte: NEGATIVE_MAX_RATING };
      break;
  }
  const search = str(query.search);
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ reviewerName: regex }, { comment: regex }, { locationName: regex }];
  }
  return filter;
};

const SORT_FIELDS = ['createTime', 'updateTime', 'rating'];
const reviewSort = (query: Request['query']): Record<string, 1 | -1> => {
  const sortBy = SORT_FIELDS.includes(str(query.sortBy)) ? str(query.sortBy) : 'createTime';
  return { [sortBy]: str(query.sortOrder) === 'asc' ? 1 : -1 };
};

export const getConnection = asyncHandler(async (_req: Request, res: Response) => {
  const configured = isConfigured();
  const connection = await getActiveConnection();
  successResponse(
    res,
    {
      connected: Boolean(connection),
      configured,
      googleEmail: connection?.googleEmail || null,
      oauthHealth: !configured ? 'not_configured' : connection ? connection.oauthHealth : 'not_connected',
      selectedAccountId: connection?.selectedAccountId ?? null,
      locationCount: connection?.locations.length ?? 0,
      lastSuccessfulSync: iso(connection?.lastSuccessfulSync),
      notifications: 'notifications_not_configured',
    },
    configured ? 'Google Business connection status' : NOT_CONFIGURED_MESSAGE
  );
});

export const getOAuthUrl = asyncHandler(async () => {
  assertConfigured();
  throw new AppError(501, NOT_IMPLEMENTED_MESSAGE);
});

// Removes the stored account and its tokens; synced reviews stay until the next connection replaces them
export const disconnect = asyncHandler(async (_req: Request, res: Response) => {
  await GbpConnectionModel.deleteMany({});
  successResponse(res, null, 'Google Business Profile disconnected');
});

export const getLocations = asyncHandler(async (_req: Request, res: Response) => {
  const connection = await getActiveConnection();
  successResponse(res, connection?.locations ?? [], 'Locations retrieved');
});

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const connection = await getActiveConnection();
  if (!connection) {
    successResponse(res, emptyDashboard(), 'Google Business Profile is not connected');
    return;
  }

  const locationId = str(req.query.locationId);
  const reviews = await GbpReviewModel.find(locationId && locationId !== 'all' ? { locationId } : {}).sort({
    createTime: -1,
  });
  const total = reviews.length;
  const replied = reviews.filter((r) => r.replyComment).length;
  const negative = reviews.filter((r) => r.rating <= NEGATIVE_MAX_RATING);
  const newCount = reviews.filter(isNew).length;

  // Monthly average for the last 6 months
  const trend: { label: string; averageRating: number; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inMonth = reviews.filter((r) => r.createTime >= start && r.createTime < end);
    trend.push({
      label: start.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      averageRating: average(inMonth),
      count: inMonth.length,
    });
  }

  successResponse(
    res,
    {
      metrics: { overallRating: average(reviews), totalReviews: total, newReviews: newCount, pendingReplies: total - replied },
      tabCounts: { all: total, new: newCount, pending: total - replied, replied, negative: negative.length },
      ratingBreakdown: [5, 4, 3, 2, 1].map((stars) => {
        const count = reviews.filter((r) => r.rating === stars).length;
        return { stars, count, percentage: total ? Math.round((count / total) * 100) : 0 };
      }),
      trend,
      byLocation: connection.locations.map((loc) => {
        const list = reviews.filter((r) => r.locationId === loc.locationId);
        return { locationId: loc.locationId, name: loc.name, averageRating: average(list), totalReviews: list.length };
      }),
      negativeReviews: negative.slice(0, 10).map((r) => ({
        id: String(r._id),
        reviewerName: r.reviewerName,
        rating: r.rating,
        comment: r.comment,
        locationName: r.locationName,
        createTime: iso(r.createTime),
        replyStatus: r.replyComment ? 'replied' : 'pending',
      })),
      lastSyncedAt: iso(connection.lastSuccessfulSync),
    },
    'Google reviews dashboard'
  );
});

export const getReviews = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(Number.parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 100);
  const connection = await getActiveConnection();
  if (!connection) {
    successResponse(
      res,
      { rows: [], pagination: { page, limit, total: 0, totalPages: 0 }, totalReviews: 0, filteredCount: 0 },
      'Google Business Profile is not connected'
    );
    return;
  }

  const filter = reviewFilter(req.query);
  const [rows, filteredCount, totalReviews] = await Promise.all([
    GbpReviewModel.find(filter).sort(reviewSort(req.query)).skip((page - 1) * limit).limit(limit),
    GbpReviewModel.countDocuments(filter),
    GbpReviewModel.countDocuments({}),
  ]);
  successResponse(
    res,
    {
      rows: rows.map(toRow),
      pagination: { page, limit, total: filteredCount, totalPages: Math.ceil(filteredCount / limit) },
      totalReviews,
      filteredCount,
    },
    'Google reviews retrieved'
  );
});

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  // Leading = + - @ would run as a formula in Excel
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const exportReviewsCsv = asyncHandler(async (req: Request, res: Response) => {
  const connection = await getActiveConnection();
  const reviews = connection ? await GbpReviewModel.find(reviewFilter(req.query)).sort(reviewSort(req.query)).limit(5000) : [];
  const header = ['Reviewer', 'Rating', 'Comment', 'Location', 'Created', 'Reply', 'Replied at'];
  const lines = reviews.map((r) =>
    [r.reviewerName, r.rating, r.comment, r.locationName, iso(r.createTime), r.replyComment, iso(r.replyUpdateTime)]
      .map(csvCell)
      .join(',')
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="google-reviews.csv"');
  res.send([header.join(','), ...lines].join('\r\n'));
});

const assertCanCallGoogle = async () => {
  assertConfigured();
  if (!(await getActiveConnection())) throw new AppError(409, 'Google Business Profile is not connected.');
  throw new AppError(501, NOT_IMPLEMENTED_MESSAGE);
};

export const syncReviews = asyncHandler(async () => {
  await assertCanCallGoogle();
});

export const replyToReview = asyncHandler(async (req: Request) => {
  if (!str(req.body?.comment)) throw new AppError(400, 'Reply text is required.');
  await assertCanCallGoogle();
});

export const deleteReviewReply = asyncHandler(async () => {
  await assertCanCallGoogle();
});
