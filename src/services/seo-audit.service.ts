// services/seo-audit.service
// Small, bounded on-page SEO crawler for the public website and competitor sites.
// It only fetches a known list of URLs (CMS pages, the default routes and the sitemap),
// never follows links, and every request has a timeout and a body-size cap.

import { Types } from "mongoose";
import Page from "../models/page.model";
import { SeoAudit, SeoAlert, SeoCompetitor } from "../models/seo-audit.models";
import { AppError } from "../utils/app-error";

type Severity = "critical" | "warning" | "notice";

export interface AuditIssue {
  ruleId: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface AuditPageResult {
  url: string;
  path: string;
  httpStatus: number | null;
  finalUrl: string | null;
  redirected: boolean;
  responseTimeMs: number | null;
  contentType: string | null;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  metaRobots: string | null;
  canonical: string | null;
  h1: string[];
  h2Count: number;
  wordCount: number;
  imageCount: number;
  imagesMissingAlt: number;
  lang: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  hasJsonLd: boolean;
  error: string | null;
  score: number;
  issues: AuditIssue[];
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 3 * 1024 * 1024;
const CONCURRENCY = 4;
const MAX_SITE_PAGES = 60;
const MAX_COMPETITOR_PAGES = 10;
export const STALE_RUN_MS = 15 * 60 * 1000;
const USER_AGENT = "Mozilla/5.0 (compatible; EnsisSeoAuditBot/1.0; +https://ensis.in)";

// Public routes of ensis-Frontend (src/app), used when the CMS or sitemap does not list them
const DEFAULT_SITE_PATHS = [
  "/", "/about-us", "/products", "/turnkey", "/consultancy", "/solutions", "/projects-and-clients",
  "/blog", "/career", "/contact", "/enquiry", "/privacy-policy", "/terms-and-conditions",
];

export const getSiteUrl = (): string => {
  const raw = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://ensis.in").trim();
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://ensis.in";
  }
};

/** Normalises an admin-entered site URL to its origin, or throws 400. */
export const normalizeSiteOrigin = (raw: unknown): string => {
  if (typeof raw !== "string" || !raw.trim()) throw new AppError(400, "URL is required");
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    throw new AppError(400, "Invalid URL");
  }
  if (!isPublicHttpUrl(url)) throw new AppError(400, "Only public http(s) websites can be added");
  return `${url.protocol}//${url.host}`;
};

// Blocks loopback/private/link-local hosts so the crawler cannot be pointed at internal services
const isPublicHttpUrl = (url: URL): boolean => {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  if (host.includes(":")) {
    if (host === "::" || host === "::1" || /^f[cd]/.test(host) || host.startsWith("fe80") || host.startsWith("::ffff:")) return false;
  }
  return true;
};

// ---------- HTTP ----------

interface FetchedDoc {
  status: number | null;
  finalUrl: string | null;
  redirected: boolean;
  contentType: string | null;
  body: string;
  timeMs: number | null;
  error: string | null;
}

const fetchDoc = async (url: string, accept = "text/html,application/xhtml+xml"): Promise<FetchedDoc> => {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: accept },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const timeMs = Date.now() - started;
    const contentType = res.headers.get("content-type");
    const length = Number(res.headers.get("content-length") || 0);
    let body = "";
    if (length <= MAX_BODY_BYTES) {
      body = (await res.text()).slice(0, MAX_BODY_BYTES);
    } else {
      await res.body?.cancel().catch(() => undefined);
    }
    return { status: res.status, finalUrl: res.url || url, redirected: res.redirected, contentType, body, timeMs, error: null };
  } catch (err) {
    const message = (err as Error)?.name === "TimeoutError" ? `Timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : (err as Error)?.message || "Request failed";
    return { status: null, finalUrl: null, redirected: false, contentType: null, body: "", timeMs: null, error: message };
  }
};

// ---------- HTML parsing (regex based, no dependencies) ----------

const decodeEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code) => String.fromCodePoint(parseInt(code, 16)));

const stripTags = (html: string): string => decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const getAttr = (tag: string, name: string): string | null => {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  if (!match) return null;
  return decodeEntities(match[1] ?? match[2] ?? match[3] ?? "").trim();
};

const findMeta = (tags: string[], key: string): string | null => {
  for (const tag of tags) {
    const name = (getAttr(tag, "name") || getAttr(tag, "property") || "").toLowerCase();
    if (name === key) return getAttr(tag, "content");
  }
  return null;
};

const parseHtml = (html: string) => {
  // SVG <title> elements and scripts must not be mistaken for page content
  const cleaned = html.replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
  const metaTags = cleaned.match(/<meta\b[^>]*>/gi) || [];
  const linkTags = cleaned.match(/<link\b[^>]*>/gi) || [];
  const titleMatch = cleaned.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const canonicalTag = linkTags.find((tag) => (getAttr(tag, "rel") || "").toLowerCase().split(/\s+/).includes("canonical"));
  const h1 = Array.from(cleaned.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)).map((m) => stripTags(m[1])).filter(Boolean);
  const h2Count = (cleaned.match(/<h2\b/gi) || []).length;
  const images = cleaned.match(/<img\b[^>]*>/gi) || [];
  const imagesMissingAlt = images.filter((tag) => getAttr(tag, "alt") === null).length;
  const htmlTag = cleaned.match(/<html\b[^>]*>/i)?.[0] || "";
  const bodyMatch = cleaned.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  const bodyText = stripTags(
    (bodyMatch ? bodyMatch[1] : cleaned)
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
  );
  const title = titleMatch ? stripTags(titleMatch[1]) : null;

  return {
    title: title || null,
    metaDescription: findMeta(metaTags, "description"),
    metaRobots: findMeta(metaTags, "robots"),
    canonical: canonicalTag ? getAttr(canonicalTag, "href") : null,
    ogTitle: findMeta(metaTags, "og:title"),
    ogDescription: findMeta(metaTags, "og:description"),
    ogImage: findMeta(metaTags, "og:image"),
    h1,
    h2Count,
    wordCount: bodyText ? bodyText.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0,
    imageCount: images.length,
    imagesMissingAlt,
    lang: getAttr(htmlTag, "lang"),
    hasJsonLd: /<script\b[^>]*type\s*=\s*["']?application\/ld\+json/i.test(html),
  };
};

// ---------- Checks ----------

const SEVERITY_PENALTY: Record<Severity, number> = { critical: 15, warning: 5, notice: 1 };

const scoreFor = (issues: AuditIssue[]): number =>
  Math.max(0, 100 - issues.reduce((sum, issue) => sum + SEVERITY_PENALTY[issue.severity], 0));

export const auditUrl = async (url: string): Promise<AuditPageResult> => {
  const doc = await fetchDoc(url);
  const path = (() => {
    try {
      return new URL(url).pathname || "/";
    } catch {
      return url;
    }
  })();

  const result: AuditPageResult = {
    url,
    path,
    httpStatus: doc.status,
    finalUrl: doc.finalUrl,
    redirected: doc.redirected,
    responseTimeMs: doc.timeMs,
    contentType: doc.contentType,
    title: null,
    titleLength: 0,
    metaDescription: null,
    metaDescriptionLength: 0,
    metaRobots: null,
    canonical: null,
    h1: [],
    h2Count: 0,
    wordCount: 0,
    imageCount: 0,
    imagesMissingAlt: 0,
    lang: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    hasJsonLd: false,
    error: doc.error,
    score: 0,
    issues: [],
  };
  const issues = result.issues;
  const add = (ruleId: string, severity: Severity, title: string, detail: string) => issues.push({ ruleId, severity, title, detail });

  if (doc.error || doc.status === null) {
    add("fetch_error", "critical", "Page could not be fetched", doc.error || "No response");
    return result;
  }
  if (doc.status >= 400) {
    add("http_error", "critical", `Page returns HTTP ${doc.status}`, `${url} responded with status ${doc.status}.`);
    return result;
  }
  if (doc.redirected) {
    add("redirected", "notice", "URL redirects", `${url} redirects to ${doc.finalUrl}.`);
  }
  if (doc.contentType && !/html/i.test(doc.contentType)) {
    add("not_html", "warning", "Response is not HTML", `Content-Type is ${doc.contentType}.`);
    result.score = scoreFor(issues);
    return result;
  }
  if (!doc.body) {
    add("empty_body", "warning", "Empty or oversized response body", "The page body was empty or larger than the audit limit.");
    result.score = scoreFor(issues);
    return result;
  }

  const parsed = parseHtml(doc.body);
  Object.assign(result, parsed, {
    titleLength: parsed.title?.length ?? 0,
    metaDescriptionLength: parsed.metaDescription?.length ?? 0,
  });

  if (!parsed.title) add("title_missing", "critical", "Missing <title>", "The page has no title tag.");
  else if (parsed.title.length < 30) add("title_too_short", "warning", "Title is too short", `Title is ${parsed.title.length} characters (aim for 30-60).`);
  else if (parsed.title.length > 60) add("title_too_long", "warning", "Title is too long", `Title is ${parsed.title.length} characters (aim for 30-60).`);

  if (!parsed.metaDescription) add("meta_desc_missing", "warning", "Missing meta description", "No <meta name=\"description\"> found.");
  else if (parsed.metaDescription.length < 70) add("meta_desc_too_short", "notice", "Meta description is short", `Meta description is ${parsed.metaDescription.length} characters (aim for 70-160).`);
  else if (parsed.metaDescription.length > 160) add("meta_desc_too_long", "notice", "Meta description is long", `Meta description is ${parsed.metaDescription.length} characters (aim for 70-160).`);

  if (parsed.h1.length === 0) add("h1_missing", "warning", "Missing H1", "The page has no <h1> heading.");
  else if (parsed.h1.length > 1) add("h1_multiple", "notice", "Multiple H1 headings", `Found ${parsed.h1.length} <h1> headings.`);

  if (!parsed.canonical) add("canonical_missing", "notice", "Missing canonical link", "No <link rel=\"canonical\"> found.");
  if (parsed.metaRobots && /noindex/i.test(parsed.metaRobots)) add("noindex", "warning", "Page is set to noindex", `meta robots: ${parsed.metaRobots}`);
  if (parsed.wordCount < 300) add("thin_content", "notice", "Thin content", `Only ${parsed.wordCount} words of visible text.`);
  if (parsed.imagesMissingAlt > 0) add("images_missing_alt", "notice", "Images without alt text", `${parsed.imagesMissingAlt} of ${parsed.imageCount} images have no alt attribute.`);
  if (!parsed.ogTitle || !parsed.ogImage) add("open_graph_incomplete", "notice", "Open Graph tags incomplete", "og:title and og:image should both be set.");
  if (!parsed.lang) add("lang_missing", "notice", "Missing html lang attribute", "Set <html lang=\"...\">.");
  if ((doc.timeMs ?? 0) > 3000) add("slow_response", "notice", "Slow server response", `The HTML took ${doc.timeMs} ms to load.`);

  result.score = scoreFor(issues);
  return result;
};

// ---------- URL discovery ----------

const fetchSitemapUrls = async (origin: string, limit: number): Promise<{ found: boolean; urls: string[] }> => {
  const host = new URL(origin).host;
  const sameHost = (value: string) => {
    try {
      return new URL(value).host === host;
    } catch {
      return false;
    }
  };
  const locs = (xml: string) => Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => decodeEntities(m[1]));

  const root = await fetchDoc(`${origin}/sitemap.xml`, "application/xml,text/xml");
  if (!root.status || root.status >= 400 || !/<(urlset|sitemapindex)\b/i.test(root.body)) return { found: false, urls: [] };

  let urls: string[] = [];
  if (/<sitemapindex\b/i.test(root.body)) {
    // Follow at most three child sitemaps on the same host
    for (const child of locs(root.body).filter(sameHost).slice(0, 3)) {
      const doc = await fetchDoc(child, "application/xml,text/xml");
      if (doc.status && doc.status < 400) urls.push(...locs(doc.body));
      if (urls.length >= limit) break;
    }
  } else {
    urls = locs(root.body);
  }
  return { found: true, urls: urls.filter(sameHost).slice(0, limit * 2) };
};

const canonicalUrlKey = (value: string): string => {
  const url = new URL(value);
  url.hash = "";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return `${url.protocol}//${url.host}${path}${url.search}`;
};

const discoverSiteUrls = async (origin: string, limit: number, includeCms: boolean) => {
  const paths = [...DEFAULT_SITE_PATHS];
  if (includeCms) {
    const pages = await Page.find({ status: { $ne: "Draft" }, visibility: { $ne: "Private" } }, { slug: 1 }).lean();
    for (const page of pages) {
      const slug = typeof page.slug === "string" ? page.slug.trim() : "";
      if (slug.startsWith("/") && !slug.includes("..")) paths.push(slug);
    }
  }
  const [sitemap, robots] = await Promise.all([
    fetchSitemapUrls(origin, limit),
    fetchDoc(`${origin}/robots.txt`, "text/plain"),
  ]);

  const seen = new Set<string>();
  const urls: string[] = [];
  const push = (value: string) => {
    try {
      const key = canonicalUrlKey(value);
      if (!seen.has(key)) {
        seen.add(key);
        urls.push(key);
      }
    } catch {
      /* ignore malformed */
    }
  };
  push(`${origin}/`);
  if (includeCms) paths.forEach((path) => push(`${origin}${path}`));
  sitemap.urls.forEach(push);

  return {
    urls: urls.slice(0, limit),
    sitemapFound: sitemap.found,
    sitemapUrlCount: sitemap.urls.length,
    robotsFound: Boolean(robots.status && robots.status < 400 && robots.body.trim()),
  };
};

const runPool = async <T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(lanes);
  return results;
};

// ---------- Audit runs ----------

const summarize = (pages: AuditPageResult[]) => {
  const stats = { pages: pages.length, errors: 0, critical: 0, warning: 0, notice: 0 };
  for (const page of pages) {
    if (page.error || (page.httpStatus ?? 0) >= 400) stats.errors += 1;
    for (const issue of page.issues) stats[issue.severity] += 1;
  }
  const score = pages.length ? Math.round(pages.reduce((sum, page) => sum + page.score, 0) / pages.length) : null;
  return { stats, score };
};

const createAlertsForSiteAudit = async (auditId: Types.ObjectId, pages: AuditPageResult[], score: number | null) => {
  const candidates: Array<{ type: string; severity: Severity; title: string; message: string; url: string | null }> = [];
  for (const page of pages) {
    for (const issue of page.issues.filter((i) => i.severity === "critical")) {
      candidates.push({ type: issue.ruleId, severity: "critical", title: `${issue.title}: ${page.path}`, message: issue.detail, url: page.url });
    }
  }
  const previous = await SeoAudit.findOne({ target: "site", status: "completed", _id: { $ne: auditId } })
    .sort({ completedAt: -1 })
    .select("score")
    .lean();
  if (score !== null && typeof previous?.score === "number" && previous.score - score >= 10) {
    candidates.push({
      type: "score_drop",
      severity: "warning",
      title: "SEO score dropped",
      message: `Site score fell from ${previous.score} to ${score} since the previous audit.`,
      url: null,
    });
  }
  // One open alert per type + URL: repeated audits do not pile up duplicates
  for (const alert of candidates.slice(0, 50)) {
    await SeoAlert.updateOne(
      { type: alert.type, url: alert.url, acknowledged: false },
      { $set: { severity: alert.severity, title: alert.title, message: alert.message, audit: auditId }, $setOnInsert: { type: alert.type, url: alert.url } },
      { upsert: true }
    );
  }
};

const executeAudit = async (auditId: Types.ObjectId, origin: string, opts: { maxPages: number; includeCms: boolean; competitorId?: string }) => {
  const started = Date.now();
  try {
    const discovery = await discoverSiteUrls(origin, opts.maxPages, opts.includeCms);
    await SeoAudit.updateOne({ _id: auditId }, { $set: { "progress.done": 0, "progress.total": discovery.urls.length } });
    const pages = await runPool(discovery.urls, async (url) => {
      const page = await auditUrl(url);
      // Progress is informational only; a failed write must not abort the run
      await SeoAudit.updateOne({ _id: auditId }, { $inc: { "progress.done": 1 } }).catch(() => undefined);
      return page;
    });
    const { stats, score } = summarize(pages);
    await SeoAudit.updateOne(
      { _id: auditId },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          durationMs: Date.now() - started,
          robotsFound: discovery.robotsFound,
          sitemapFound: discovery.sitemapFound,
          sitemapUrlCount: discovery.sitemapUrlCount,
          stats,
          score,
          pages,
        },
      }
    );
    if (opts.competitorId) {
      await SeoCompetitor.updateOne({ _id: opts.competitorId }, { $set: { lastCrawlAt: new Date(), lastScore: score } });
    } else {
      await createAlertsForSiteAudit(auditId, pages, score);
    }
  } catch (err) {
    console.error("[SEO audit] run failed:", (err as Error).message);
    await SeoAudit.updateOne(
      { _id: auditId },
      { $set: { status: "failed", completedAt: new Date(), durationMs: Date.now() - started, error: (err as Error).message } }
    ).catch(() => undefined);
  }
};

const startAudit = async (filter: Record<string, unknown>, origin: string, opts: { maxPages: number; includeCms: boolean; competitorId?: string }, trigger: string) => {
  // Runs older than the stale window (e.g. interrupted by a restart) are closed as failed
  await SeoAudit.updateMany(
    { ...filter, status: "running", startedAt: { $lt: new Date(Date.now() - STALE_RUN_MS) } },
    { $set: { status: "failed", error: "Audit did not finish", completedAt: new Date() } }
  );
  const running = await SeoAudit.findOne({ ...filter, status: "running" }).select("_id status").lean();
  if (running) return { crawlId: String(running._id), status: "running" };

  const audit = await SeoAudit.create({
    target: opts.competitorId ? "competitor" : "site",
    competitor: opts.competitorId || null,
    siteUrl: origin,
    status: "running",
    trigger,
    startedAt: new Date(),
  });
  // Runs in the background; the admin polls / reloads afterwards
  void executeAudit(audit._id as Types.ObjectId, origin, opts);
  return { crawlId: String(audit._id), status: "running" };
};

export const startSiteAudit = (trigger = "manual") =>
  startAudit({ target: "site" }, getSiteUrl(), { maxPages: MAX_SITE_PAGES, includeCms: true }, trigger);

export const startCompetitorAudit = async (competitorId: string) => {
  const competitor = await SeoCompetitor.findById(competitorId).lean();
  if (!competitor) throw new AppError(404, "Competitor not found");
  const origin = normalizeSiteOrigin(competitor.url);
  return startAudit({ target: "competitor", competitor: competitor._id }, origin, { maxPages: MAX_COMPETITOR_PAGES, includeCms: false, competitorId }, "manual");
};

export const getLatestCompletedAudit = (filter: Record<string, unknown> = { target: "site" }) =>
  SeoAudit.findOne({ ...filter, status: "completed" }).sort({ completedAt: -1 }).lean();

// ---------- Comparison ----------

type AuditDoc = NonNullable<Awaited<ReturnType<typeof getLatestCompletedAudit>>>;

const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

const observedFor = (audit: AuditDoc | null): Record<string, number | null> => {
  if (!audit) {
    return {
      score: null, pagesCrawled: null, averageWordCount: null, averageResponseTimeMs: null, errorPages: null,
      pagesMissingTitle: null, pagesMissingDescription: null, pagesMissingH1: null, pagesMissingCanonical: null,
      criticalIssues: null, warnings: null, notices: null,
    };
  }
  const pages = (audit.pages || []) as unknown as AuditPageResult[];
  const ok = pages.filter((p) => !p.error && (p.httpStatus ?? 0) < 400);
  const has = (p: AuditPageResult, ruleId: string) => (p.issues || []).some((i) => i.ruleId === ruleId);
  return {
    score: audit.score ?? null,
    pagesCrawled: pages.length,
    averageWordCount: average(ok.map((p) => p.wordCount || 0)),
    averageResponseTimeMs: average(ok.map((p) => p.responseTimeMs).filter((v): v is number => typeof v === "number")),
    errorPages: pages.length - ok.length,
    pagesMissingTitle: ok.filter((p) => has(p, "title_missing")).length,
    pagesMissingDescription: ok.filter((p) => has(p, "meta_desc_missing")).length,
    pagesMissingH1: ok.filter((p) => has(p, "h1_missing")).length,
    pagesMissingCanonical: ok.filter((p) => has(p, "canonical_missing")).length,
    criticalIssues: audit.stats?.critical ?? 0,
    warnings: audit.stats?.warning ?? 0,
    notices: audit.stats?.notice ?? 0,
  };
};

export const getCompetitorComparison = async () => {
  const [siteAudit, competitors] = await Promise.all([
    getLatestCompletedAudit({ target: "site" }),
    SeoCompetitor.find({ isActive: true }).sort({ createdAt: 1 }).lean(),
  ]);
  const rows = await Promise.all(
    competitors.map(async (competitor) => ({
      siteId: String(competitor._id),
      label: competitor.label,
      url: competitor.url,
      observed: observedFor(await getLatestCompletedAudit({ target: "competitor", competitor: competitor._id })),
    }))
  );
  return {
    primary: { label: "Ensis", url: getSiteUrl(), observed: observedFor(siteAudit) },
    competitors: rows,
  };
};

// ---------- Page lookup for recommendations ----------

/** Admin page ids are route slugs ("home", "about-us", "products/x"); returns the route path. */
export const pageIdToPath = (id: string): string => {
  const clean = decodeURIComponent(String(id || "")).trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!clean || clean === "home") return "/";
  if (!/^[a-z0-9][a-z0-9\-_/]*$/.test(clean) || clean.includes("..") || clean.length > 200) {
    throw new AppError(400, "Invalid page id");
  }
  return `/${clean}`;
};

/** Latest audited snapshot of one route, or a fresh single-page check when it was never audited. */
export const getPageSnapshot = async (path: string): Promise<{ page: AuditPageResult; source: "audit" | "live" }> => {
  const audit = await getLatestCompletedAudit({ target: "site" });
  const found = ((audit?.pages || []) as unknown as AuditPageResult[]).find((p) => (p.path.replace(/\/+$/, "") || "/") === path);
  if (found) return { page: found, source: "audit" };
  return { page: await auditUrl(`${getSiteUrl()}${path === "/" ? "/" : path}`), source: "live" };
};
