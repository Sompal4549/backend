import { networkInterfaces } from 'os';
import tls from 'tls';
import { EnquiryModel, IEnquiry } from '../models/enquiry.model';
import { LeadModel } from '../models/lead.model';
import { BlogModel } from '../models/blog.model';
import PageModel from '../models/page.model';
import ApplicationModel from '../models/applicationModel';
import { ComponentContentModel } from '../models/component-content.model';
import { NavigationModel } from '../models/navigation.model';
import { config } from '../config/app.config';
import { escapeRegex } from '../utils/escape-regex';
import { growthPercent, AnalyticsSummary, PageSpeedRaw, SearchConsoleSummary } from './google-api.service';
import {
  analyticsReadiness,
  getAnalyticsSummary,
  getPageSpeedReport,
  getSearchConsoleSummary,
  pageSpeedReadiness,
  publicSiteUrl,
  resolveIntegrations,
  searchConsoleReadiness,
  ResolvedIntegrations,
} from './integration-settings.service';

type SourceStatus = 'connected' | 'not_connected' | 'error';

const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

const percentChange = growthPercent;

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');

/** Google Analytics (GA4) source: real data when configured, otherwise not_connected / error — never invented. */
const buildAnalyticsSource = async (creds: ResolvedIntegrations): Promise<DashboardSource<AnalyticsSummary>> => {
  const readiness = analyticsReadiness(creds);
  if (!readiness.configured) {
    return sourceOf<AnalyticsSummary>(readiness.isError ? 'error' : 'not_connected', null, readiness.reason);
  }
  try {
    return sourceOf('connected', await getAnalyticsSummary(creds));
  } catch (error) {
    return sourceOf<AnalyticsSummary>('error', null, `Google Analytics: ${errorText(error)}`);
  }
};

/** Search Console source: real data when configured, otherwise not_connected / error — never invented. */
const buildSearchConsoleSource = async (creds: ResolvedIntegrations): Promise<DashboardSource<SearchConsoleSummary>> => {
  const readiness = searchConsoleReadiness(creds);
  if (!readiness.configured) {
    return sourceOf<SearchConsoleSummary>(readiness.isError ? 'error' : 'not_connected', null, readiness.reason);
  }
  try {
    return sourceOf('connected', await getSearchConsoleSummary(creds));
  } catch (error) {
    return sourceOf<SearchConsoleSummary>('error', null, `Search Console: ${errorText(error)}`);
  }
};

/**
 * Live dashboard overview for the admin panel.
 * `internal` and `siteStatus` come from the CMS database and live server checks; `indexCoverage`
 * is derived from CMS robots settings (not Google data). `analytics`, `searchConsole` and the
 * lab metrics of `pageSpeed` come from Google APIs configured in Settings → Integrations and
 * are reported as `not_connected` / `error` (with a message) when unavailable.
 */
export const buildLiveDashboardOverview = async () => {
  const now = new Date();
  const creds = await resolveIntegrations();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalPages,
    totalPosts,
    totalEnquiries,
    enquiriesMtd,
    totalLeads,
    totalApplications,
    postsLast30,
    postsPrev30,
    enquiriesLast30,
    enquiriesPrev30,
    recentEnquiries,
    cityBreakdown,
    actionQuotation,
    actionTurnkey,
    actionConsultancy,
    actionSupport,
    pageSpeed,
    indexCoverage,
    siteStatus,
    analytics,
    searchConsole,
  ] = await Promise.all([
    PageModel.countDocuments(),
    BlogModel.countDocuments(),
    EnquiryModel.countDocuments(),
    EnquiryModel.countDocuments({ createdAt: { $gte: monthStart } }),
    LeadModel.countDocuments(),
    ApplicationModel.countDocuments(),
    BlogModel.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
    BlogModel.countDocuments({ createdAt: { $gte: daysAgo(60), $lt: daysAgo(30) } }),
    EnquiryModel.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
    EnquiryModel.countDocuments({ createdAt: { $gte: daysAgo(60), $lt: daysAgo(30) } }),
    EnquiryModel.find().sort({ createdAt: -1 }).limit(5).lean(),
    EnquiryModel.aggregate<{ city: string | null; count: number }>([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, city: '$_id', count: 1 } },
    ]),
    EnquiryModel.countDocuments({
      status: { $in: ['pending', 'new'] },
      $or: [
        { projectType: { $regex: 'quot|price|cost|rate|order', $options: 'i' } },
        { message: { $regex: 'quot|price|cost|rate|order', $options: 'i' } },
      ],
    }),
    EnquiryModel.countDocuments({
      status: { $in: ['pending', 'new'] },
      $or: [
        { projectType: { $regex: 'turnkey|setup|clinic|centre|center|resort|layout', $options: 'i' } },
        { message: { $regex: 'turnkey|setup|clinic|centre|center|resort|layout', $options: 'i' } },
      ],
    }),
    EnquiryModel.countDocuments({
      status: { $in: ['pending', 'new'] },
      $or: [
        { projectType: { $regex: 'consult|nabh|training|sop', $options: 'i' } },
        { message: { $regex: 'consult|nabh|training|sop', $options: 'i' } },
      ],
    }),
    EnquiryModel.countDocuments({
      status: { $in: ['pending', 'new'] },
      $or: [
        { projectType: { $regex: 'warrant|repair|service|install|support', $options: 'i' } },
        { message: { $regex: 'warrant|repair|service|install|support', $options: 'i' } },
      ],
    }),
    buildPageSpeedSource(creds),
    buildIndexCoverageSource(),
    buildSiteStatusSource(),
    buildAnalyticsSource(creds),
    buildSearchConsoleSource(creds),
  ]);

  const recentSubmissions = recentEnquiries.map((enquiry) => ({
    id: String(enquiry._id),
    name: enquiry.fullName || 'Enquiry',
    type: enquiry.projectType || 'General Enquiry',
    city: enquiry.city || undefined,
    createdAt: enquiry.createdAt instanceof Date ? enquiry.createdAt.toISOString() : String(enquiry.createdAt ?? now),
  }));

  const topLocations = cityBreakdown.map((entry) => ({
    city: entry.city || 'Unknown',
    count: entry.count,
  }));

  return {
    generatedAt: now.toISOString(),
    sources: {
      internal: {
        status: 'connected' as SourceStatus,
        updatedAt: now.toISOString(),
        data: {
          totalPages,
          totalPosts,
          totalEnquiries,
          enquiriesMtd,
          totalRequests: totalEnquiries + totalLeads + totalApplications,
          growth: {
            posts: percentChange(postsLast30, postsPrev30),
            enquiriesMtd: percentChange(enquiriesLast30, enquiriesPrev30),
          },
          recentSubmissions,
          topLocations,
          actionRequired: {
            exhibitor: actionQuotation,
            buyer: actionTurnkey,
            sponsor: actionConsultancy,
            visitor: actionSupport,
          },
        },
      },
      analytics,
      searchConsole,
      pageSpeed,
      indexCoverage,
      siteStatus,
    },
  };
};

export type LiveDashboardOverview = Awaited<ReturnType<typeof buildLiveDashboardOverview>>;

export type EnquiryListResult = {
  enquiries: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export const listEnquiries = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
}): Promise<EnquiryListResult> => {
  const page = Math.max(options.page && options.page > 0 ? options.page : 1, 1);
  const limit = Math.min(Math.max(options.limit && options.limit > 0 ? options.limit : 20, 1), 1000);

  const filter: Record<string, unknown> = {};
  if (options.search) {
    const regex = { $regex: escapeRegex(options.search), $options: 'i' };
    filter.$or = [
      { fullName: regex },
      { email: regex },
      { mobileNumber: regex },
      { city: regex },
      { companyOrganization: regex },
      { projectType: regex },
    ];
  }
  if (options.status) {
    filter.status = options.status;
  }
  if (options.source) {
    filter.source = options.source;
  }

  const [docs, total] = await Promise.all([
    EnquiryModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    EnquiryModel.countDocuments(filter),
  ]);

  const enquiries = docs.map((doc) => {
    const enquiry = doc as unknown as IEnquiry & { _id: unknown; createdAt: Date; updatedAt: Date };
    return {
      _id: String(enquiry._id),
      name: enquiry.fullName,
      fullName: enquiry.fullName,
      email: enquiry.email,
      phone: enquiry.mobileNumber,
      mobileNumber: enquiry.mobileNumber,
      city: enquiry.city ?? null,
      state: enquiry.state ?? null,
      companyOrganization: enquiry.companyOrganization ?? null,
      organization: enquiry.companyOrganization ?? null,
      projectType: enquiry.projectType,
      interest: enquiry.projectType ?? null,
      category: enquiry.source === 'contact' ? 'contact' : 'csr',
      projectSize: enquiry.projectSize ?? null,
      budgetRange: enquiry.budgetRange ?? null,
      servicesRequired: enquiry.servicesRequired ?? [],
      timeline: enquiry.timeline ?? null,
      preferredContact: enquiry.preferredContact ?? null,
      attachmentUrl: enquiry.attachmentUrl ?? null,
      agreeToContact: !!enquiry.agreeToContact,
      source: enquiry.source ?? 'other',
      isRead: !!enquiry.isRead,
      message: enquiry.message,
      status: enquiry.status,
      pincode: (enquiry as any).pincode ?? null,
      alternatePhone: (enquiry as any).alternatePhone ?? null,
      subject: (enquiry as any).subject || enquiry.projectType || null,
      notes: enquiry.notes ?? null,
      createdAt: enquiry.createdAt instanceof Date ? enquiry.createdAt.toISOString() : String(enquiry.createdAt ?? ''),
      updatedAt: enquiry.updatedAt instanceof Date ? enquiry.updatedAt.toISOString() : String(enquiry.updatedAt ?? ''),
    };
  });

  return {
    enquiries,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
};

/* ---------------------------------------------------------------------------
 * Dashboard sub-endpoints
 *
 * GET /dashboard/pagespeed, /dashboard/index-coverage, /dashboard/site-status
 *
 * Every response uses the same `{ status, updatedAt, data }` source envelope
 * that `LiveDashboardOverview.sources` carries (ensis-admin/src/lib/dashboardApi.ts),
 * so the admin panel reads live values instead of its built-in fallbacks.
 * ------------------------------------------------------------------------- */

export type DashboardSource<T> = {
  status: SourceStatus;
  updatedAt: string;
  message?: string;
  data: T | null;
};

type SeoCheckStatus = 'good' | 'needs_work' | 'not_checked';

export type PageSpeedData = {
  strategy: 'mobile' | 'desktop';
  /** true only when the lab metrics below come from a real PageSpeed Insights run */
  lighthouseAvailable: boolean;
  url: string | null;
  performanceScore: number | null;
  /** CMS-derived SEO score (see buildSeoChecks) */
  seoScore: number;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  tbt: number | null;
  seoChecks?: Array<{ key: string; label: string; status: SeoCheckStatus }>;
};

/** Derived from the CMS robots directive per page — this is NOT Google index data. */
export type IndexCoverageData = {
  source: 'cms';
  status: 'good' | 'needs_attention';
  total: number;
  indexed: number;
  notIndexed: number;
};

export type SiteStatusData = {
  sslValid: boolean;
  sslExpiryDays: number;
  certificateDaysRemaining: number;
  sslIssuer: string;
  securityHeaders: { present: number; total: number };
  securityHeadersScore: string;
  online: boolean;
  responseTimeMs: number;
  httpStatus: number;
  redirected: boolean;
  ipAddress: string;
  serverIp: string;
  nodeVersion: string;
};

const sourceOf = <T>(status: SourceStatus, data: T | null, message?: string): DashboardSource<T> => ({
  status,
  updatedAt: new Date().toISOString(),
  ...(message ? { message } : {}),
  data,
});

const connectedSource = <T>(data: T): DashboardSource<T> => sourceOf('connected', data);

const check = (key: string, label: string, status: SeoCheckStatus) => ({ key, label, status });

/**
 * SEO checks derived from the CMS itself (page records + component content +
 * navigation). Lab/network checks that cannot be answered from the database are
 * reported as `not_checked` rather than invented.
 */
const buildSeoChecks = async (): Promise<Array<{ key: string; label: string; status: SeoCheckStatus }>> => {
  const [pages, componentCount, navigationCount] = await Promise.all([
    PageModel.find({}, { 'seo.metaTitle': 1, 'seo.metaDescription': 1, 'seo.schema': 1, 'seo.ogJson': 1 }).lean(),
    ComponentContentModel.countDocuments(),
    NavigationModel.countDocuments(),
  ]);

  const titles = pages.map((page) => page.seo?.metaTitle ?? '');
  const descriptions = pages.map((page) => page.seo?.metaDescription ?? '');
  const hasSchema = pages.some((page) => {
    const schema = (page.seo as { schema?: string; ogJson?: string } | undefined) ?? {};
    return Boolean((schema.schema ?? '').trim() || (schema.ogJson ?? '').trim());
  });

  const titlesValid = titles.length > 0 && titles.every((title) => title.trim().length > 0 && title.length <= 65);
  const descriptionsValid =
    descriptions.length > 0 && descriptions.every((description) => description.trim().length > 0 && description.length <= 155);

  return [
    check('meta-title', 'Meta Title', titlesValid ? 'good' : 'needs_work'),
    check('meta-description', 'Meta Description', descriptionsValid ? 'good' : 'needs_work'),
    check('content-quality', 'Content Quality', componentCount > 0 ? 'good' : 'needs_work'),
    check('internal-linking', 'Internal Linking', navigationCount > 0 ? 'good' : 'needs_work'),
    check('schema-markup', 'Schema Markup', hasSchema ? 'good' : 'needs_work'),
    check('image-alt', 'Images (ALT Text)', 'not_checked'),
    check('mobile-friendly', 'Mobile Friendliness', 'not_checked'),
    check('page-speed', 'Page Speed', 'not_checked'),
  ];
};

/** How long the overview waits for a PageSpeed run before answering with a "running" state (PSI can take 20s+). */
const PAGESPEED_WAIT_MS = 4_000;

type LabMetrics = Pick<PageSpeedData, 'performanceScore' | 'lcp' | 'inp' | 'cls' | 'fcp' | 'ttfb' | 'tbt'>;

const EMPTY_LAB: LabMetrics = { performanceScore: null, lcp: null, inp: null, cls: null, fcp: null, ttfb: null, tbt: null };

const roundOrNull = (value: number | null | undefined, digits = 0): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Lab metrics in ms (CLS unitless). LCP / INP / CLS prefer real-user field data when Google has it. */
const labMetricsFrom = (raw: PageSpeedRaw): LabMetrics => {
  const audit = (key: string) => raw.lighthouseResult.audits[key]?.numericValue ?? null;
  const field = (key: string) => raw.loadingExperience?.metrics?.[key]?.percentile ?? null;
  const performance = raw.lighthouseResult.categories.performance?.score;
  const fieldCls = field('CUMULATIVE_LAYOUT_SHIFT_SCORE');

  return {
    performanceScore: typeof performance === 'number' ? Math.round(performance * 100) : null,
    lcp: roundOrNull(field('LARGEST_CONTENTFUL_PAINT_MS') ?? audit('largest-contentful-paint')),
    inp: roundOrNull(field('INTERACTION_TO_NEXT_PAINT')),
    cls: roundOrNull(fieldCls != null ? fieldCls / 100 : audit('cumulative-layout-shift'), 3),
    fcp: roundOrNull(audit('first-contentful-paint')),
    ttfb: roundOrNull(audit('server-response-time')),
    tbt: roundOrNull(audit('total-blocking-time')),
  };
};

const scoreSeoChecks = (seoChecks: Array<{ key: string; label: string; status: SeoCheckStatus }>) => {
  const graded = seoChecks.filter((item) => item.status !== 'not_checked');
  const passed = graded.filter((item) => item.status === 'good').length;
  return graded.length > 0 ? Math.round((passed / graded.length) * 100) : 0;
};

/**
 * PageSpeed source.
 * `seoChecks` / `seoScore` are computed from real CMS data and always returned.
 * Lab metrics come from a real PageSpeed Insights run (homepage, mobile) when a key is configured
 * in Settings → Integrations; otherwise they are null and the status is `not_connected` / `error`.
 */
export const buildPageSpeedSource = async (creds?: ResolvedIntegrations): Promise<DashboardSource<PageSpeedData>> => {
  const resolved = creds ?? (await resolveIntegrations());
  const seoChecks = await buildSeoChecks();
  const url = `${publicSiteUrl()}/`;

  const build = (lab: LabMetrics, lighthouseAvailable: boolean): PageSpeedData => {
    const checks = seoChecks.map((item) =>
      item.key === 'page-speed' && lab.performanceScore != null
        ? { ...item, status: (lab.performanceScore >= 90 ? 'good' : 'needs_work') as SeoCheckStatus }
        : item
    );
    return {
      strategy: 'mobile',
      lighthouseAvailable,
      url: lighthouseAvailable ? url : null,
      ...lab,
      seoScore: scoreSeoChecks(checks),
      seoChecks: checks,
    };
  };

  const readiness = pageSpeedReadiness(resolved);
  if (!readiness.configured) {
    return sourceOf(readiness.isError ? 'error' : 'not_connected', build(EMPTY_LAB, false), readiness.reason);
  }

  const settled = getPageSpeedReport(resolved, url, 'mobile').then(
    (value) => ({ value }),
    (error: unknown) => ({ error })
  );
  let timer: NodeJS.Timeout | undefined;
  const outcome = await Promise.race([
    settled,
    new Promise<{ pending: true }>((resolve) => {
      timer = setTimeout(() => resolve({ pending: true }), PAGESPEED_WAIT_MS);
    }),
  ]);
  if (timer) clearTimeout(timer);

  if ('pending' in outcome) {
    return sourceOf('connected', build(EMPTY_LAB, false), 'PageSpeed Insights test is running — results appear shortly.');
  }
  if ('error' in outcome) {
    return sourceOf('error', build(EMPTY_LAB, false), `PageSpeed Insights: ${errorText(outcome.error)}`);
  }
  return connectedSource(build(labMetricsFrom(outcome.value), true));
};

/**
 * Index coverage source, derived from the CMS robots directive per page.
 * This is NOT Google index data (Search Console's URL Inspection API is per-URL only).
 */
export const buildIndexCoverageSource = async (): Promise<DashboardSource<IndexCoverageData>> => {
  const [total, indexed] = await Promise.all([
    PageModel.countDocuments(),
    PageModel.countDocuments({ robots: 'index, follow' }),
  ]);
  const notIndexed = Math.max(total - indexed, 0);

  return sourceOf<IndexCoverageData>(
    'connected',
    {
      source: 'cms',
      status: notIndexed === 0 ? 'good' : 'needs_attention',
      total,
      indexed,
      notIndexed,
    },
    'Based on CMS robots settings (index / noindex) — not Google index data.'
  );
};

const localIPv4 = (): string => {
  const interfaces = networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    }
  }
  return '127.0.0.1';
};

/** Live self-check against the running server's health route. */
const selfHealthCheck = async (): Promise<{ online: boolean; httpStatus: number; responseTimeMs: number }> => {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`http://127.0.0.1:${config.port}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return { online: response.ok, httpStatus: response.status, responseTimeMs: Date.now() - started };
  } catch {
    return { online: false, httpStatus: 0, responseTimeMs: Date.now() - started };
  }
};

type CertificateResult = { sslValid: boolean; daysRemaining: number; issuer: string };

/** Real TLS handshake against the public site host; returns zeros when unreachable. */
const checkCertificate = (host: string): Promise<CertificateResult> =>
  new Promise((resolve) => {
    const settle = (result: CertificateResult) => resolve(result);

    try {
      const socket = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false }, () => {
        const certificate = socket.getPeerCertificate();
        socket.destroy();

        if (!certificate || !certificate.valid_to) {
          return settle({ sslValid: false, daysRemaining: 0, issuer: 'Unavailable' });
        }

        const expiry = new Date(certificate.valid_to).getTime();
        const daysRemaining = Number.isFinite(expiry) ? Math.floor((expiry - Date.now()) / DAY_MS) : 0;
        const issuer =
          (typeof certificate.issuer === 'object' && certificate.issuer?.CN) ||
          (typeof certificate.issuer === 'object' && certificate.issuer?.O) ||
          'Unknown';

        settle({
          sslValid: socket.authorized && daysRemaining > 0,
          daysRemaining,
          issuer: String(issuer),
        });
      });

      socket.setTimeout(2500, () => {
        socket.destroy();
        settle({ sslValid: false, daysRemaining: 0, issuer: 'Timeout' });
      });

      socket.on('error', () => settle({ sslValid: false, daysRemaining: 0, issuer: 'Unavailable' }));
    } catch {
      settle({ sslValid: false, daysRemaining: 0, issuer: 'Unavailable' });
    }
  });

const publicHost = (): string => {
  const raw = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://ensis.in';
  try {
    return new URL(raw).hostname;
  } catch {
    return 'ensis.in';
  }
};

const isHttpsTarget = (): boolean => {
  const raw = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://ensis.in';
  return raw.startsWith('https://');
};

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];

/** Counts the security headers the public site actually sends; total is 0 when the site could not be reached. */
const checkSecurityHeaders = async (): Promise<{ present: number; total: number }> => {
  try {
    const response = await fetch(`${publicSiteUrl()}/`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    const present = SECURITY_HEADERS.filter((name) => response.headers.has(name)).length;
    void response.body?.cancel().catch(() => undefined);
    return { present, total: SECURITY_HEADERS.length };
  } catch {
    return { present: 0, total: 0 };
  }
};

/** Site status source — self health check + TLS certificate inspection + live security-header check. */
export const buildSiteStatusSource = async (): Promise<DashboardSource<SiteStatusData>> => {
  const host = publicHost();
  const [health, certificate, securityHeaders] = await Promise.all([
    selfHealthCheck(),
    isHttpsTarget() ? checkCertificate(host) : Promise.resolve({ sslValid: false, daysRemaining: 0, issuer: 'HTTP target' }),
    checkSecurityHeaders(),
  ]);

  const ip = localIPv4();

  return connectedSource<SiteStatusData>({
    sslValid: certificate.sslValid,
    sslExpiryDays: certificate.daysRemaining,
    certificateDaysRemaining: certificate.daysRemaining,
    sslIssuer: certificate.issuer,
    securityHeaders,
    securityHeadersScore:
      securityHeaders.total > 0 ? `${securityHeaders.present}/${securityHeaders.total} Headers` : 'Not checked',
    online: health.online,
    responseTimeMs: health.responseTimeMs,
    httpStatus: health.httpStatus,
    redirected: false,
    ipAddress: ip,
    serverIp: ip,
    nodeVersion: process.version,
  });
};
