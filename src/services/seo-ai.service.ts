// services/seo-ai.service
// OpenAI-backed SEO recommendations built only from real audit data. No key = 503, never fake output.

import { Types } from "mongoose";
import { AppError } from "../utils/app-error";
import { AuditPageResult, getLatestCompletedAudit, getPageSnapshot, getSiteUrl } from "./seo-audit.service";

type Priority = "high" | "medium" | "low";

const SYSTEM_PROMPT =
  "You are a senior technical SEO consultant for ENSIS (ensis.in), an Indian manufacturer of Panchkarma, Ayurvedic and spa equipment " +
  "offering turnkey wellness setups and consultancy. Base every recommendation strictly on the audit data you are given; do not invent " +
  "metrics, rankings or traffic numbers. Respond with valid JSON only, matching the requested schema, without markdown.";

const RESPONSE_SCHEMA = `{
  "summary": "2-4 sentence overview",
  "positiveSignals": ["things already done well"],
  "items": [{
    "ruleId": "audit rule id this addresses, or null",
    "category": "Technical | On-page | Content | Metadata | Links | Schema",
    "title": "short action title",
    "whyItMatters": "one or two sentences",
    "priority": "high | medium | low",
    "recommendedFix": "what to change",
    "implementation": "how to implement it on this site",
    "suggestedTitle": "new <title> (30-60 chars) or null",
    "suggestedDescription": "new meta description (120-160 chars) or null",
    "headingSuggestions": ["..."],
    "internalLinkSuggestions": [{ "fromOrTo": "/path", "anchorText": "...", "reason": "..." }],
    "contentSuggestions": ["..."],
    "schemaSuggestion": "schema.org type or JSON-LD hint, or null"
  }]
}`;

const getOpenAiConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AppError(503, "AI recommendations are not configured: OPENAI_API_KEY is missing on the server");
  return { apiKey, model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini" };
};

const callOpenAiJson = async (prompt: string): Promise<{ model: string; data: any }> => {
  const { apiKey, model } = getOpenAiConfig();
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (err) {
    console.warn("[SEO AI] OpenAI request failed:", (err as Error).message);
    throw new AppError(502, "Could not reach OpenAI. Please try again.");
  }
  if (!res.ok) {
    console.warn(`[SEO AI] OpenAI (${model}) HTTP ${res.status}:`, (await res.text()).slice(0, 500));
    throw new AppError(502, `OpenAI request failed (HTTP ${res.status}). Check the API key, model and quota.`);
  }
  const body: any = await res.json();
  const content = body?.choices?.[0]?.message?.content?.trim();
  try {
    return { model, data: JSON.parse(content) };
  } catch {
    throw new AppError(502, "OpenAI returned an unreadable response. Please try again.");
  }
};

const str = (value: unknown, max = 2000): string => (typeof value === "string" ? value.trim().slice(0, max) : "");
const strOrNull = (value: unknown, max = 2000): string | null => str(value, max) || null;
const strList = (value: unknown, limit = 10): string[] =>
  Array.isArray(value) ? value.map((v) => str(v, 500)).filter(Boolean).slice(0, limit) : [];

const normalizeItems = (raw: unknown) =>
  (Array.isArray(raw) ? raw : [])
    .filter((item) => item && typeof item === "object")
    .slice(0, 15)
    .map((item: any) => {
      const priority = str(item.priority).toLowerCase();
      return {
        ruleId: strOrNull(item.ruleId, 80),
        category: str(item.category, 60) || "On-page",
        title: str(item.title, 200) || "Recommendation",
        whyItMatters: str(item.whyItMatters),
        priority: (["high", "medium", "low"].includes(priority) ? priority : "medium") as Priority,
        recommendedFix: str(item.recommendedFix),
        implementation: str(item.implementation),
        suggestedTitle: strOrNull(item.suggestedTitle, 120),
        suggestedDescription: strOrNull(item.suggestedDescription, 320),
        headingSuggestions: strList(item.headingSuggestions),
        internalLinkSuggestions: (Array.isArray(item.internalLinkSuggestions) ? item.internalLinkSuggestions : [])
          .filter((link: any) => link && typeof link === "object")
          .slice(0, 10)
          .map((link: any) => ({ fromOrTo: str(link.fromOrTo, 300), anchorText: str(link.anchorText, 200), reason: str(link.reason, 500) })),
        contentSuggestions: strList(item.contentSuggestions),
        schemaSuggestion: strOrNull(item.schemaSuggestion, 2000),
      };
    });

const compactPage = (page: AuditPageResult) => ({
  path: page.path,
  httpStatus: page.httpStatus,
  title: page.title,
  metaDescription: page.metaDescription,
  h1: (page.h1 || []).slice(0, 3),
  h2Count: page.h2Count,
  canonical: page.canonical,
  metaRobots: page.metaRobots,
  wordCount: page.wordCount,
  imageCount: page.imageCount,
  imagesMissingAlt: page.imagesMissingAlt,
  hasJsonLd: page.hasJsonLd,
  ogTitle: page.ogTitle,
  ogImage: page.ogImage,
  responseTimeMs: page.responseTimeMs,
  score: page.score,
  issues: (page.issues || []).map((i) => `${i.severity}:${i.ruleId} - ${i.detail}`),
});

const buildResponse = (scope: "site" | "page", url: string, route: string | null, model: string, data: any) => ({
  status: "ok" as const,
  message: null,
  recommendation: {
    id: new Types.ObjectId().toString(),
    scope,
    url,
    route,
    provider: "openai",
    providerAvailable: true,
    model,
    summary: strOrNull(data?.summary, 2000),
    positiveSignals: strList(data?.positiveSignals),
    items: normalizeItems(data?.items),
    telemetry: null,
    status: "completed",
    error: null,
    generatedAt: new Date().toISOString(),
  },
});

export const generateSiteRecommendation = async () => {
  getOpenAiConfig();
  const audit = await getLatestCompletedAudit({ target: "site" });
  if (!audit) {
    return { status: "no_data" as const, message: "Run a site audit first; recommendations are generated from its results.", recommendation: null };
  }
  const pages = (audit.pages || []) as unknown as AuditPageResult[];
  const ruleCounts: Record<string, { severity: string; title: string; pages: string[] }> = {};
  for (const page of pages) {
    for (const issue of page.issues || []) {
      const entry = (ruleCounts[issue.ruleId] ||= { severity: issue.severity, title: issue.title, pages: [] });
      entry.pages.push(page.path);
    }
  }
  const input = {
    site: audit.siteUrl,
    auditedAt: audit.completedAt,
    score: audit.score,
    stats: audit.stats,
    robotsFound: audit.robotsFound,
    sitemapFound: audit.sitemapFound,
    issuesByRule: Object.entries(ruleCounts).map(([ruleId, v]) => ({
      ruleId, severity: v.severity, title: v.title, affectedPages: v.pages.length, examples: v.pages.slice(0, 8),
    })),
    pages: pages.slice(0, 40).map(compactPage),
  };
  const prompt =
    `Site-wide SEO audit results for ${audit.siteUrl} (JSON):\n${JSON.stringify(input).slice(0, 60000)}\n\n` +
    `Give the 5-10 highest-impact site-wide recommendations, highest priority first. Respond in this JSON shape:\n${RESPONSE_SCHEMA}`;
  const { model, data } = await callOpenAiJson(prompt);
  return buildResponse("site", audit.siteUrl, null, model, data);
};

export const generatePageRecommendation = async (path: string, cmsSeo: Record<string, unknown> | null) => {
  getOpenAiConfig();
  const { page, source } = await getPageSnapshot(path);
  if (page.error || page.httpStatus === null) {
    return { status: "no_data" as const, message: `Could not fetch ${page.url}: ${page.error || "no response"}`, recommendation: null };
  }
  const prompt =
    `On-page SEO audit of ${page.url} (${source === "audit" ? "from the latest site audit" : "checked just now"}), JSON:\n` +
    `${JSON.stringify(compactPage(page)).slice(0, 30000)}\n\n` +
    (cmsSeo ? `SEO fields currently stored in the CMS for this page: ${JSON.stringify(cmsSeo).slice(0, 5000)}\n\n` : "") +
    `Give 3-8 concrete recommendations for this page, highest priority first. Include a suggestedTitle and suggestedDescription ` +
    `in the first metadata-related item. Respond in this JSON shape:\n${RESPONSE_SCHEMA}`;
  const { model, data } = await callOpenAiJson(prompt);
  return buildResponse("page", page.url || `${getSiteUrl()}${path}`, path, model, data);
};
