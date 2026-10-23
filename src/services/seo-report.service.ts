// services/seo-report.service
// Read models for the admin SEO screens, derived only from stored SeoAudit runs and SeoAlert rows.
// Nothing here estimates or invents data: values the crawler does not measure are simply absent.

import { SeoAlert, SeoAudit } from "../models/seo-audit.models";
import { AppError } from "../utils/app-error";
import { AuditIssue, AuditPageResult, STALE_RUN_MS, getLatestCompletedAudit, getSiteUrl, pageIdToPath } from "./seo-audit.service";

type Severity = AuditIssue["severity"];
type ScoreGroup = "technical" | "onPage" | "content" | "performance";

// Every crawler rule mapped to an issue category (the admin page filter values) and a score group
const RULES: Record<string, { category: string; group: ScoreGroup }> = {
  fetch_error: { category: "indexing", group: "technical" },
  http_error: { category: "indexing", group: "technical" },
  redirected: { category: "indexing", group: "technical" },
  noindex: { category: "indexing", group: "technical" },
  not_html: { category: "structure", group: "technical" },
  lang_missing: { category: "structure", group: "technical" },
  canonical_missing: { category: "canonical", group: "technical" },
  empty_body: { category: "content", group: "content" },
  thin_content: { category: "content", group: "content" },
  images_missing_alt: { category: "images", group: "content" },
  title_missing: { category: "metadata", group: "onPage" },
  title_too_short: { category: "metadata", group: "onPage" },
  title_too_long: { category: "metadata", group: "onPage" },
  meta_desc_missing: { category: "metadata", group: "onPage" },
  meta_desc_too_short: { category: "metadata", group: "onPage" },
  meta_desc_too_long: { category: "metadata", group: "onPage" },
  open_graph_incomplete: { category: "metadata", group: "onPage" },
  h1_missing: { category: "headings", group: "onPage" },
  h1_multiple: { category: "headings", group: "onPage" },
  slow_response: { category: "performance", group: "performance" },
};
const ruleOf = (ruleId: string) => RULES[ruleId] || { category: "structure", group: "technical" as ScoreGroup };

const GROUP_LABELS: Record<ScoreGroup, string> = {
  technical: "Technical",
  onPage: "On-page",
  content: "Content",
  performance: "Performance",
};
const GROUPS = Object.keys(GROUP_LABELS) as ScoreGroup[];

// Must match SEVERITY_PENALTY in seo-audit.service (page score = 100 - sum of penalties)
const SEVERITY_PENALTY: Record<Severity, number> = { critical: 15, warning: 5, notice: 1 };

const iso = (value: unknown): string | null => (value ? new Date(value as string).toISOString() : null);
const normalizePath = (path: string) => (path || "/").replace(/\/+$/, "") || "/";

/** "/" -> "home", "/about-us" -> "about-us"; the inverse of pageIdToPath */
export const pathToPageId = (path: string): string => {
  const clean = normalizePath(path).replace(/^\/+/, "");
  return clean || "home";
};

const isErrorPage = (page: AuditPageResult) => Boolean(page.error) || page.httpStatus === null || page.httpStatus >= 400;
const hasRule = (page: AuditPageResult, ruleId: string) => (page.issues || []).some((issue) => issue.ruleId === ruleId);

const issueCounts = (issues: AuditIssue[]) => {
  const counts = { critical: 0, warning: 0, notice: 0, total: issues.length };
  for (const issue of issues) counts[issue.severity] += 1;
  return counts;
};

const groupScore = (pages: AuditPageResult[], group: ScoreGroup): number | null => {
  if (!pages.length) return null;
  const total = pages.reduce((sum, page) => {
    const penalty = (page.issues || [])
      .filter((issue) => ruleOf(issue.ruleId).group === group)
      .reduce((acc, issue) => acc + SEVERITY_PENALTY[issue.severity], 0);
    return sum + Math.max(0, 100 - penalty);
  }, 0);
  return Math.round(total / pages.length);
};

const toPageDto = (page: AuditPageResult) => {
  const issues = (page.issues || []).map((issue) => ({ ...issue, category: ruleOf(issue.ruleId).category }));
  const broken = isErrorPage(page);
  const noindex = hasRule(page, "noindex");
  return {
    ...page,
    id: pathToPageId(page.path),
    path: normalizePath(page.path),
    issues,
    issueCounts: issueCounts(issues),
    issueCategories: Array.from(new Set(issues.map((issue) => issue.category))),
    indexable: !broken && !noindex,
    indexabilityReason: broken
      ? page.error || `HTTP ${page.httpStatus}`
      : noindex
        ? `meta robots: ${page.metaRobots}`
        : null,
  };
};

const getRunningSiteAudit = () =>
  SeoAudit.findOne({ target: "site", status: "running", startedAt: { $gte: new Date(Date.now() - STALE_RUN_MS) } })
    .sort({ startedAt: -1 })
    .select("_id status startedAt progress")
    .lean();

const requireLatestAudit = async () => {
  const audit = await getLatestCompletedAudit({ target: "site" });
  if (!audit) throw new AppError(404, "No completed SEO audit yet. Run an audit first.");
  return audit;
};

// ---------- Overview ----------

export const getLatestOverview = async () => {
  const [audit, running, lastRun, history, openAlerts] = await Promise.all([
    getLatestCompletedAudit({ target: "site" }),
    getRunningSiteAudit(),
    SeoAudit.findOne({ target: "site", status: { $ne: "running" } }).sort({ startedAt: -1 }).select("_id status error completedAt").lean(),
    SeoAudit.find({ target: "site", status: "completed" })
      .sort({ completedAt: -1 })
      .limit(10)
      .select("_id completedAt score stats")
      .lean(),
    SeoAlert.countDocuments({ acknowledged: false }),
  ]);

  const runningDto = running
    ? {
        id: String(running._id),
        status: "running",
        startedAt: iso(running.startedAt),
        progress: { done: running.progress?.done ?? 0, total: running.progress?.total ?? 0 },
      }
    : null;
  const lastFailure =
    lastRun && lastRun.status === "failed"
      ? { id: String(lastRun._id), error: lastRun.error || "Audit failed", completedAt: iso(lastRun.completedAt) }
      : null;

  if (!audit) {
    return {
      hasData: false,
      siteUrl: getSiteUrl(),
      message: "No SEO audit has been run yet.",
      running: runningDto,
      lastFailure,
      openAlerts,
      audit: null,
      previousScore: null,
      scores: null,
      counts: null,
      topIssues: [],
      scoreExplanation: null,
      history: [],
    };
  }

  const pages = (audit.pages || []) as unknown as AuditPageResult[];
  const okPages = pages.filter((page) => !isErrorPage(page));
  const share = (predicate: (page: AuditPageResult) => boolean) =>
    okPages.length ? Math.round((okPages.filter(predicate).length / okPages.length) * 100) : null;

  // Issues grouped by rule, with how many pages each affects
  const byRule = new Map<string, { ruleId: string; severity: Severity; title: string; pages: Set<string>; count: number }>();
  for (const page of pages) {
    for (const issue of page.issues || []) {
      const entry = byRule.get(issue.ruleId) || { ruleId: issue.ruleId, severity: issue.severity, title: issue.title, pages: new Set<string>(), count: 0 };
      entry.pages.add(page.path);
      entry.count += 1;
      byRule.set(issue.ruleId, entry);
    }
  }
  const severityRank: Record<Severity, number> = { critical: 0, warning: 1, notice: 2 };
  const rules = Array.from(byRule.values()).sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity] || b.pages.size - a.pages.size
  );

  const previous = history.find((item) => String(item._id) !== String(audit._id));

  return {
    hasData: true,
    siteUrl: audit.siteUrl,
    message: null,
    running: runningDto,
    // The newest finished run failed, so the results shown are from an older successful run
    lastFailure,
    openAlerts,
    audit: {
      id: String(audit._id),
      status: audit.status,
      trigger: audit.trigger,
      startedAt: iso(audit.startedAt),
      completedAt: iso(audit.completedAt),
      durationMs: audit.durationMs ?? null,
      robotsFound: Boolean(audit.robotsFound),
      sitemapFound: Boolean(audit.sitemapFound),
      sitemapUrlCount: audit.sitemapUrlCount ?? 0,
      score: audit.score ?? null,
      stats: {
        pages: audit.stats?.pages ?? pages.length,
        errors: audit.stats?.errors ?? 0,
        critical: audit.stats?.critical ?? 0,
        warning: audit.stats?.warning ?? 0,
        notice: audit.stats?.notice ?? 0,
      },
    },
    previousScore: typeof previous?.score === "number" ? previous.score : null,
    scores: {
      overall: audit.score ?? null,
      technical: groupScore(pages, "technical"),
      onPage: groupScore(pages, "onPage"),
      content: groupScore(pages, "content"),
      performance: groupScore(pages, "performance"),
    },
    counts: {
      urlsCrawled: pages.length,
      errorPages: pages.length - okPages.length,
      indexablePages: okPages.filter((page) => !hasRule(page, "noindex")).length,
      healthyPages: pages.filter((page) => !(page.issues || []).some((issue) => issue.severity === "critical")).length,
      criticalIssues: audit.stats?.critical ?? 0,
      warnings: audit.stats?.warning ?? 0,
      notices: audit.stats?.notice ?? 0,
      pagesMissingTitle: okPages.filter((page) => hasRule(page, "title_missing")).length,
      pagesMissingDescription: okPages.filter((page) => hasRule(page, "meta_desc_missing")).length,
      pagesMissingH1: okPages.filter((page) => hasRule(page, "h1_missing")).length,
      pagesMissingCanonical: okPages.filter((page) => hasRule(page, "canonical_missing")).length,
      redirectingPages: okPages.filter((page) => page.redirected).length,
      // Percentages of successfully fetched pages
      share700Words: share((page) => (page.wordCount || 0) >= 700),
      shareScore90: share((page) => (page.score || 0) >= 90),
      shareMetaOk: share((page) => !(page.issues || []).some((issue) => ruleOf(issue.ruleId).category === "metadata")),
      shareImagesWithAlt: share((page) => (page.imagesMissingAlt || 0) === 0),
    },
    topIssues: rules.slice(0, 10).map((rule) => ({
      ruleId: rule.ruleId,
      severity: rule.severity,
      category: GROUP_LABELS[ruleOf(rule.ruleId).group],
      title: rule.title,
      affectedPages: rule.pages.size,
    })),
    scoreExplanation: {
      overall: audit.score ?? null,
      categories: GROUPS.map((group) => {
        const groupRules = rules.filter((rule) => ruleOf(rule.ruleId).group === group);
        return {
          category: GROUP_LABELS[group],
          score: groupScore(pages, group),
          rawPenalty: groupRules.reduce((sum, rule) => sum + rule.count * SEVERITY_PENALTY[rule.severity], 0),
          issueCount: groupRules.reduce((sum, rule) => sum + rule.count, 0),
          contributions: groupRules.map((rule) => ({
            ruleId: rule.ruleId,
            title: rule.title,
            severity: rule.severity,
            count: rule.count,
            penalty: rule.count * SEVERITY_PENALTY[rule.severity],
          })),
        };
      }),
      formula: {
        severityPenalty: SEVERITY_PENALTY,
        pagesConsidered: pages.length,
        description:
          "Each crawled page starts at 100 and loses points per issue (critical, warning, notice). " +
          "The site score is the average page score; category scores apply the same rule to that category's issues only.",
      },
    },
    history: history
      .slice()
      .reverse()
      .map((item) => ({ id: String(item._id), completedAt: iso(item.completedAt), score: item.score ?? null, stats: item.stats })),
  };
};

// ---------- Pages ----------

export interface PageListQuery {
  page?: unknown;
  limit?: unknown;
  search?: unknown;
  status?: unknown;
  indexable?: unknown;
  severity?: unknown;
  issueCategory?: unknown;
  sortBy?: unknown;
  sortDir?: unknown;
}

const statusClass = (page: AuditPageResult) => {
  if (page.error || page.httpStatus === null) return "error";
  return `${Math.floor(page.httpStatus / 100)}xx`;
};

export const listLatestPages = async (query: PageListQuery) => {
  const audit = await getLatestCompletedAudit({ target: "site" });
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const pageNumber = Math.max(1, Number(query.page) || 1);
  if (!audit) {
    return {
      auditId: null,
      completedAt: null,
      message: "No SEO audit has been run yet. Run the first audit to see every page here.",
      pages: [],
      meta: { page: 1, limit, total: 0, totalPages: 0 },
    };
  }

  let rows = ((audit.pages || []) as unknown as AuditPageResult[]).map(toPageDto);
  const search = typeof query.search === "string" ? query.search.trim().toLowerCase() : "";
  if (search) rows = rows.filter((row) => row.url.toLowerCase().includes(search) || (row.title || "").toLowerCase().includes(search));
  if (typeof query.status === "string" && query.status) rows = rows.filter((row) => statusClass(row) === query.status);
  if (query.indexable === "true" || query.indexable === "false") rows = rows.filter((row) => String(row.indexable) === query.indexable);
  if (query.severity === "critical" || query.severity === "warning" || query.severity === "notice") {
    rows = rows.filter((row) => row.issueCounts[query.severity as Severity] > 0);
  }
  if (typeof query.issueCategory === "string" && query.issueCategory) {
    rows = rows.filter((row) => row.issueCategories.includes(query.issueCategory as string));
  }

  const dir = query.sortDir === "desc" ? -1 : 1;
  const sortValue = (row: (typeof rows)[number]): number | string => {
    switch (query.sortBy) {
      case "url":
        return row.path;
      case "status":
        return row.httpStatus ?? 0;
      case "critical":
        return row.issueCounts.critical * 10000 + row.issueCounts.warning * 100 + row.issueCounts.notice;
      case "wordCount":
        return row.wordCount || 0;
      case "responseTime":
        return row.responseTimeMs ?? 0;
      default:
        return row.score ?? 0;
    }
  };
  rows.sort((a, b) => {
    const [x, y] = [sortValue(a), sortValue(b)];
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });

  const total = rows.length;
  return {
    auditId: String(audit._id),
    completedAt: iso(audit.completedAt),
    message: total ? null : "No pages match these filters.",
    pages: rows.slice((pageNumber - 1) * limit, pageNumber * limit),
    meta: { page: pageNumber, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getLatestPage = async (pageId: string) => {
  const path = pageIdToPath(pageId);
  const audit = await requireLatestAudit();
  const found = ((audit.pages || []) as unknown as AuditPageResult[]).find((page) => normalizePath(page.path) === path);
  if (!found) throw new AppError(404, `${path} was not part of the latest audit`);

  // The same route in earlier completed audits (newest first)
  const previous = await SeoAudit.find(
    { target: "site", status: "completed", "pages.path": found.path },
    { completedAt: 1, pages: { $elemMatch: { path: found.path } } }
  )
    .sort({ completedAt: -1 })
    .limit(10)
    .lean();

  return {
    auditId: String(audit._id),
    completedAt: iso(audit.completedAt),
    page: toPageDto(found),
    history: previous.map((run) => {
      const snapshot = ((run.pages || []) as unknown as AuditPageResult[])[0];
      return {
        capturedAt: iso(run.completedAt),
        score: snapshot?.score ?? null,
        issueCounts: issueCounts(snapshot?.issues || []),
        wordCount: snapshot?.wordCount ?? 0,
        httpStatus: snapshot?.httpStatus ?? null,
        responseTimeMs: snapshot?.responseTimeMs ?? null,
      };
    }),
  };
};

// ---------- Broken pages ----------

/** Audited URLs that failed or returned 4xx/5xx. The crawler does not follow links, so sources are not known. */
export const getBrokenLinks = async () => {
  const audit = await getLatestCompletedAudit({ target: "site" });
  if (!audit) return { auditId: null, completedAt: null, links: [] };
  const host = new URL(audit.siteUrl).host;
  const links = ((audit.pages || []) as unknown as AuditPageResult[]).filter(isErrorPage).map((page) => ({
    url: page.url,
    path: normalizePath(page.path),
    httpStatus: page.httpStatus,
    statusClass: statusClass(page),
    isInternal: (() => {
      try {
        return new URL(page.url).host === host;
      } catch {
        return true;
      }
    })(),
    error: page.error,
  }));
  return { auditId: String(audit._id), completedAt: iso(audit.completedAt), links };
};

// ---------- Alerts ----------

export const listAlerts = async (includeAcknowledged: boolean) => {
  const alerts = await SeoAlert.find(includeAcknowledged ? {} : { acknowledged: false })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();
  return alerts.map((alert) => ({
    id: String(alert._id),
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    url: alert.url,
    acknowledged: Boolean(alert.acknowledged),
    acknowledgedAt: iso(alert.acknowledgedAt),
    acknowledgedBy: alert.acknowledgedBy ?? null,
    createdAt: iso(alert.createdAt),
    updatedAt: iso(alert.updatedAt),
  }));
};
