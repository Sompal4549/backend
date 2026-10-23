import { createPrivateKey, createSign } from 'crypto';

/**
 * Minimal Google API clients (no SDK): service-account OAuth via a signed RS256 JWT,
 * GA4 Data API, Search Console searchAnalytics and PageSpeed Insights v5.
 * Results are cached in memory so the admin dashboard does not hit Google on every load.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GA4_URL = 'https://analyticsdata.googleapis.com/v1beta';
const SEARCH_CONSOLE_URL = 'https://www.googleapis.com/webmasters/v3';
const PAGESPEED_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export const GOOGLE_SCOPES = {
  analytics: 'https://www.googleapis.com/auth/analytics.readonly',
  searchConsole: 'https://www.googleapis.com/auth/webmasters.readonly',
} as const;

const API_TIMEOUT_MS = 8_000;
const PAGESPEED_TIMEOUT_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export class GoogleApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
    this.name = 'GoogleApiError';
  }
}

/* ------------------------------------------------------------------------- *
 * Cache
 * ------------------------------------------------------------------------- */

type CacheEntry = { expiresAt: number; value?: unknown; error?: Error };
const resultCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

/** Cached call with in-flight de-duplication. Failures are cached for `errorTtlMs` so a broken setup is not retried on every request. */
export const cachedCall = <T>(key: string, ttlMs: number, errorTtlMs: number, fn: () => Promise<T>, force = false): Promise<T> => {
  const hit = resultCache.get(key);
  if (!force && hit && hit.expiresAt > Date.now()) {
    return hit.error ? Promise.reject(hit.error) : Promise.resolve(hit.value as T);
  }
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const next = fn()
    .then((value) => {
      resultCache.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    })
    .catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      resultCache.set(key, { expiresAt: Date.now() + errorTtlMs, error: err });
      throw err;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, next);
  return next;
};

export const clearGoogleCache = () => {
  resultCache.clear();
  tokenCache.clear();
};

/* ------------------------------------------------------------------------- *
 * HTTP
 * ------------------------------------------------------------------------- */

const googleErrorMessage = (body: unknown, status: number): string => {
  const data = body as { error?: { message?: string } | string; error_description?: string } | null;
  if (data && typeof data.error === 'object' && data.error?.message) return data.error.message;
  if (data?.error_description) return data.error_description;
  if (data && typeof data.error === 'string') return data.error;
  return `Google API responded with HTTP ${status}`;
};

const fetchJson = async <T>(url: string, init: RequestInit, timeoutMs = API_TIMEOUT_MS): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new GoogleApiError(`Google API did not respond within ${Math.round(timeoutMs / 1000)}s`);
    }
    throw new GoogleApiError('Could not reach Google API (network error)');
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // non-JSON body
  }
  if (!response.ok) {
    throw new GoogleApiError(googleErrorMessage(body, response.status).slice(0, 300), response.status);
  }
  return body as T;
};

/* ------------------------------------------------------------------------- *
 * Service account OAuth (JWT bearer grant, RS256)
 * ------------------------------------------------------------------------- */

export type ServiceAccountKey = { client_email: string; private_key: string };

/** Validates a pasted service-account JSON key file; throws a readable message on bad input. */
export const parseServiceAccountJson = (raw: string): ServiceAccountKey => {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('Service account key is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Service account key is not a JSON object');
  if (parsed.type !== undefined && parsed.type !== 'service_account') {
    throw new Error('JSON key must be of type "service_account"');
  }
  const email = parsed.client_email;
  const privateKey = parsed.private_key;
  if (typeof email !== 'string' || !email.includes('@')) throw new Error('Service account key is missing "client_email"');
  if (typeof privateKey !== 'string' || !privateKey.includes('PRIVATE KEY')) {
    throw new Error('Service account key is missing "private_key"');
  }
  try {
    createPrivateKey(privateKey);
  } catch {
    throw new Error('Service account "private_key" could not be read');
  }
  return { client_email: email, private_key: privateKey };
};

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

const base64url = (value: string) => Buffer.from(value).toString('base64url');

export const getServiceAccountToken = async (account: ServiceAccountKey, scope: string): Promise<string> => {
  const cacheKey = `${account.client_email}|${scope}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;

  const issuedAt = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(
    JSON.stringify({ iss: account.client_email, scope, aud: TOKEN_URL, iat: issuedAt, exp: issuedAt + 3600 })
  )}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url');

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: `${unsigned}.${signature}`,
  });

  const result = await fetchJson<{ access_token?: string; expires_in?: number }>(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'token request failed';
    throw new GoogleApiError(`Google sign-in failed for the service account: ${message}`, (error as GoogleApiError)?.status);
  });

  if (!result.access_token) throw new GoogleApiError('Google sign-in returned no access token');
  tokenCache.set(cacheKey, {
    token: result.access_token,
    expiresAt: Date.now() + (result.expires_in ?? 3600) * 1000,
  });
  return result.access_token;
};

/* ------------------------------------------------------------------------- *
 * Helpers
 * ------------------------------------------------------------------------- */

/** Percentage change rounded to one decimal; null when there is no previous value. */
export const growthPercent = (current: number, previous: number): number | null => {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/* ------------------------------------------------------------------------- *
 * GA4 Data API
 * ------------------------------------------------------------------------- */

export type AnalyticsSummary = {
  users: number;
  sessions: number;
  pageViews: number;
  averageSessionSeconds: number;
  bounceRate: number;
  conversions: number;
  conversionMetric: 'conversions' | 'keyEvents';
  daily: Array<{ date: string; users: number; pageViews: number }>;
  pages: Array<{ path: string; views: number; visitors: number; averageSessionSeconds: number; bounceRate: number }>;
  growth: {
    users: number | null;
    sessions: number | null;
    pageViews: number | null;
    averageSession: number | null;
    bounceRate: number | null;
    conversionRate: number | null;
  };
  range: { startDate: string; endDate: string };
};

type Ga4Report = {
  rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>;
};

/** Accepts "123456789" or "properties/123456789"; returns the numeric id or null. */
export const normalizeGa4PropertyId = (raw: string): string | null => {
  const value = raw.trim().replace(/^properties\//i, '');
  return /^\d{4,20}$/.test(value) ? value : null;
};

const runGa4Report = (propertyId: string, token: string, body: Record<string, unknown>) =>
  fetchJson<Ga4Report>(`${GA4_URL}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const metricNumbers = (row: NonNullable<Ga4Report['rows']>[number] | undefined, count: number): number[] =>
  Array.from({ length: count }, (_, index) => {
    const value = Number(row?.metricValues?.[index]?.value ?? 0);
    return Number.isFinite(value) ? value : 0;
  });

const CURRENT_RANGE = { startDate: '28daysAgo', endDate: 'yesterday' };
const PREVIOUS_RANGE = { startDate: '56daysAgo', endDate: '29daysAgo' };
const BASE_TOTAL_METRICS = ['activeUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'bounceRate'];

const fetchGa4Totals = async (propertyId: string, token: string) => {
  const run = (conversionMetric: 'conversions' | 'keyEvents') =>
    Promise.all(
      [CURRENT_RANGE, PREVIOUS_RANGE].map((range) =>
        runGa4Report(propertyId, token, {
          dateRanges: [range],
          metrics: [...BASE_TOTAL_METRICS, conversionMetric].map((name) => ({ name })),
        })
      )
    ).then(([current, previous]) => ({ current, previous, conversionMetric }));

  try {
    return await run('conversions');
  } catch (error) {
    // Newer properties renamed "conversions" to "keyEvents"; retry only on a bad-request answer.
    if (error instanceof GoogleApiError && error.status === 400) return run('keyEvents');
    throw error;
  }
};

export const fetchAnalyticsSummary = async (
  account: ServiceAccountKey,
  propertyId: string
): Promise<AnalyticsSummary> => {
  const token = await getServiceAccountToken(account, GOOGLE_SCOPES.analytics);

  const [totals, dailyReport, pagesReport] = await Promise.all([
    fetchGa4Totals(propertyId, token),
    runGa4Report(propertyId, token, {
      dateRanges: [CURRENT_RANGE],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    runGa4Report(propertyId, token, {
      dateRanges: [CURRENT_RANGE],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
  ]);

  const [users, sessions, pageViews, avgSession, bounce, conversions] = metricNumbers(totals.current.rows?.[0], 6);
  const [prevUsers, prevSessions, prevPageViews, prevAvgSession, prevBounce, prevConversions] = metricNumbers(
    totals.previous.rows?.[0],
    6
  );

  const conversionRate = sessions > 0 ? conversions / sessions : 0;
  const prevConversionRate = prevSessions > 0 ? prevConversions / prevSessions : 0;

  const end = new Date(Date.now() - DAY_MS);
  const start = new Date(end.getTime() - 27 * DAY_MS);

  return {
    users: Math.round(users),
    sessions: Math.round(sessions),
    pageViews: Math.round(pageViews),
    averageSessionSeconds: round(avgSession, 1),
    bounceRate: round(bounce * 100, 1),
    conversions: Math.round(conversions),
    conversionMetric: totals.conversionMetric,
    daily: (dailyReport.rows ?? []).map((row) => {
      const [dayUsers, dayViews] = metricNumbers(row, 2);
      return { date: row.dimensionValues?.[0]?.value ?? '', users: Math.round(dayUsers), pageViews: Math.round(dayViews) };
    }),
    pages: (pagesReport.rows ?? []).map((row) => {
      const [views, visitors, pageAvg, pageBounce] = metricNumbers(row, 4);
      return {
        path: row.dimensionValues?.[0]?.value || '/',
        views: Math.round(views),
        visitors: Math.round(visitors),
        averageSessionSeconds: round(pageAvg, 1),
        bounceRate: round(pageBounce * 100, 1),
      };
    }),
    growth: {
      users: growthPercent(users, prevUsers),
      sessions: growthPercent(sessions, prevSessions),
      pageViews: growthPercent(pageViews, prevPageViews),
      averageSession: growthPercent(avgSession, prevAvgSession),
      bounceRate: growthPercent(bounce, prevBounce),
      conversionRate: growthPercent(conversionRate, prevConversionRate),
    },
    range: { startDate: isoDate(start), endDate: isoDate(end) },
  };
};

/* ------------------------------------------------------------------------- *
 * Search Console
 * ------------------------------------------------------------------------- */

export type SearchConsoleSummary = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  growth: { clicks: number | null; impressions: number | null; ctr: number | null; position: number | null };
  queries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  daily: Array<{ date: string; clicks: number; impressions: number }>;
  range: { startDate: string; endDate: string };
};

type SearchAnalyticsResponse = {
  rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }>;
};

/** Accepts "sc-domain:example.com" or a URL-prefix property ("https://example.com/"); returns the normalised value or null. */
export const normalizeSearchConsoleSite = (raw: string): string | null => {
  const value = raw.trim();
  if (/^sc-domain:[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) return value.toLowerCase();
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `${url.origin}${url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`}`;
  } catch {
    return null;
  }
};

export const fetchSearchConsoleSummary = async (
  account: ServiceAccountKey,
  siteUrl: string
): Promise<SearchConsoleSummary> => {
  const token = await getServiceAccountToken(account, GOOGLE_SCOPES.searchConsole);
  const endpoint = `${SEARCH_CONSOLE_URL}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const query = (body: Record<string, unknown>) =>
    fetchJson<SearchAnalyticsResponse>(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  // Search Console data lags by ~2-3 days
  const end = new Date(Date.now() - 3 * DAY_MS);
  const start = new Date(end.getTime() - 27 * DAY_MS);
  const prevEnd = new Date(start.getTime() - DAY_MS);
  const prevStart = new Date(prevEnd.getTime() - 27 * DAY_MS);
  const current = { startDate: isoDate(start), endDate: isoDate(end) };
  const previous = { startDate: isoDate(prevStart), endDate: isoDate(prevEnd) };

  const [totals, prevTotals, daily, queries] = await Promise.all([
    query({ ...current, rowLimit: 1 }),
    query({ ...previous, rowLimit: 1 }),
    query({ ...current, dimensions: ['date'], rowLimit: 100 }),
    query({ ...current, dimensions: ['query'], rowLimit: 10 }),
  ]);

  const total = totals.rows?.[0] ?? {};
  const prev = prevTotals.rows?.[0] ?? {};
  const clicks = total.clicks ?? 0;
  const impressions = total.impressions ?? 0;
  const ctr = (total.ctr ?? 0) * 100;
  const position = total.position ?? 0;

  return {
    clicks: Math.round(clicks),
    impressions: Math.round(impressions),
    ctr: round(ctr, 2),
    position: round(position, 1),
    growth: {
      clicks: growthPercent(clicks, prev.clicks ?? 0),
      impressions: growthPercent(impressions, prev.impressions ?? 0),
      ctr: growthPercent(ctr, (prev.ctr ?? 0) * 100),
      position: growthPercent(position, prev.position ?? 0),
    },
    queries: (queries.rows ?? []).map((row) => ({
      query: row.keys?.[0] ?? '',
      clicks: Math.round(row.clicks ?? 0),
      impressions: Math.round(row.impressions ?? 0),
      ctr: round((row.ctr ?? 0) * 100, 2),
      position: round(row.position ?? 0, 1),
    })),
    daily: (daily.rows ?? []).map((row) => ({
      date: row.keys?.[0] ?? '',
      clicks: Math.round(row.clicks ?? 0),
      impressions: Math.round(row.impressions ?? 0),
    })),
    range: current,
  };
};

/* ------------------------------------------------------------------------- *
 * PageSpeed Insights v5
 * ------------------------------------------------------------------------- */

/** Only the parts of a PSI response the admin uses (the full response carries large screenshots). */
export type PageSpeedRaw = {
  lighthouseResult: {
    categories: Record<string, { score: number | null }>;
    audits: Record<string, { numericValue?: number; score?: number | null; displayValue?: string; details?: unknown }>;
  };
  loadingExperience: { overall_category?: string; metrics?: Record<string, { percentile?: number; category?: string }> } | null;
};

const KEPT_AUDITS = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
  'speed-index',
  'server-response-time',
  'interactive',
  'total-byte-weight',
  'dom-size',
  'resource-summary',
];

export const runPageSpeedInsights = async (
  url: string,
  strategy: 'mobile' | 'desktop',
  apiKey: string
): Promise<PageSpeedRaw> => {
  const params = new URLSearchParams({ url, strategy, key: apiKey });
  ['performance', 'accessibility', 'best-practices', 'seo'].forEach((category) => params.append('category', category));

  const raw = await fetchJson<{
    lighthouseResult?: {
      categories?: Record<string, { score?: number | null }>;
      audits?: Record<string, { numericValue?: number; score?: number | null; displayValue?: string; details?: unknown }>;
    };
    loadingExperience?: PageSpeedRaw['loadingExperience'];
  }>(`${PAGESPEED_URL}?${params.toString()}`, { headers: { Accept: 'application/json' } }, PAGESPEED_TIMEOUT_MS);

  const categories: PageSpeedRaw['lighthouseResult']['categories'] = {};
  for (const [key, value] of Object.entries(raw.lighthouseResult?.categories ?? {})) {
    categories[key] = { score: typeof value?.score === 'number' ? value.score : null };
  }
  const audits: PageSpeedRaw['lighthouseResult']['audits'] = {};
  for (const key of KEPT_AUDITS) {
    const audit = raw.lighthouseResult?.audits?.[key];
    if (!audit) continue;
    audits[key] = {
      numericValue: audit.numericValue,
      score: audit.score,
      displayValue: audit.displayValue,
      ...(key === 'resource-summary' ? { details: audit.details } : {}),
    };
  }
  if (!raw.lighthouseResult) throw new GoogleApiError('PageSpeed Insights returned no Lighthouse result');

  return {
    lighthouseResult: { categories, audits },
    loadingExperience: raw.loadingExperience
      ? { overall_category: raw.loadingExperience.overall_category, metrics: raw.loadingExperience.metrics ?? {} }
      : null,
  };
};
