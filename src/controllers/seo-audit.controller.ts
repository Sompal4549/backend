// controllers/seo-audit.controller
// Admin SEO audit, competitor, alert and AI-recommendation endpoints (all behind auth + admin).

import { Request, Response } from "express";
import Page from "../models/page.model";
import { SeoAlert, SeoAudit, SeoCompetitor } from "../models/seo-audit.models";
import * as auditService from "../services/seo-audit.service";
import * as aiService from "../services/seo-ai.service";
import * as reportService from "../services/seo-report.service";
import { asyncHandler } from "../utils/async-handler";
import { successResponse } from "../utils/api-response";
import { AppError } from "../utils/app-error";
import { AuthRequest } from "../middlewares/auth.middleware";
import { isObjectIdString } from "../utils/object-id";

const requireObjectId = (value: string, label: string) => {
  if (!isObjectIdString(value)) throw new AppError(400, `Invalid ${label} id`);
};

const editorName = (req: AuthRequest) => (req.user as { name?: string; email?: string } | undefined)?.name
  || (req.user as { email?: string } | undefined)?.email
  || "Admin";

// Finds the CMS page (read by the website via /pages/:slug) for an admin route id like "home" or "about-us"
const findCmsPage = (id: string) => {
  const path = auditService.pageIdToPath(id);
  const key = path === "/" ? "home" : path.slice(1);
  return Page.findOne({ $or: [{ slug: path }, { slug: key }, { configKey: id }] });
};

const toCompetitorDto = (doc: any) => ({
  id: String(doc._id),
  url: doc.url,
  label: doc.label,
  isActive: doc.isActive !== false,
  lastCrawlAt: doc.lastCrawlAt ? new Date(doc.lastCrawlAt).toISOString() : null,
  lastScore: typeof doc.lastScore === "number" ? doc.lastScore : null,
});

// ---------- Audits ----------

export const startAudit = asyncHandler(async (_req: Request, res: Response) => {
  const result = await auditService.startSiteAudit("manual");
  successResponse(res, result, "SEO audit started", 202);
});

export const getLatestAudit = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, await reportService.getLatestOverview(), "Latest SEO audit retrieved");
});

export const listLatestAuditPages = asyncHandler(async (req: Request, res: Response) => {
  successResponse(res, await reportService.listLatestPages(req.query), "Audited pages retrieved");
});

export const getLatestAuditPage = asyncHandler(async (req: Request, res: Response) => {
  successResponse(res, await reportService.getLatestPage(req.params.pageId), "Audited page retrieved");
});

export const getBrokenLinks = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, await reportService.getBrokenLinks(), "Broken pages retrieved");
});

// ---------- Recommendations ----------

export const generateSiteRecommendation = asyncHandler(async (_req: Request, res: Response) => {
  const result = await aiService.generateSiteRecommendation();
  successResponse(res, result, result.message || "Site recommendations generated");
});

export const generatePageRecommendation = asyncHandler(async (req: Request, res: Response) => {
  const path = auditService.pageIdToPath(req.params.id);
  const page = await findCmsPage(req.params.id);
  const seo = page?.seo;
  const cmsSeo = seo
    ? { metaTitle: seo.metaTitle, metaDescription: seo.metaDescription, metaKeywords: seo.metaKeywords, canonical: seo.canonical }
    : null;
  const result = await aiService.generatePageRecommendation(path, cmsSeo);
  successResponse(res, result, result.message || "Page recommendations generated");
});

// ---------- Apply SEO fix to a page ----------

export const updatePageSeo = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page: pageId, metaTitle, metaDescription } = req.body || {};
  if (typeof pageId !== "string" || !pageId.trim()) throw new AppError(400, "page is required");

  const update: Record<string, unknown> = {};
  if (typeof metaTitle === "string" && metaTitle.trim()) update["seo.metaTitle"] = metaTitle.trim().slice(0, 200);
  if (typeof metaDescription === "string" && metaDescription.trim()) update["seo.metaDescription"] = metaDescription.trim().slice(0, 500);
  if (!Object.keys(update).length) throw new AppError(400, "metaTitle or metaDescription is required");

  const existing = await findCmsPage(pageId.trim());
  if (!existing) throw new AppError(404, "Page not found");

  const page = await Page.findByIdAndUpdate(
    existing._id,
    { $set: { ...update, updatedBy: editorName(req) } },
    { new: true }
  );
  successResponse(res, page, "Page SEO updated");
});

// ---------- Alerts ----------

export const listAlerts = asyncHandler(async (req: Request, res: Response) => {
  const includeAcknowledged = req.query.includeAcknowledged === "true";
  successResponse(res, await reportService.listAlerts(includeAcknowledged), "Alerts retrieved");
});

export const acknowledgeAlert =asyncHandler(async (req: AuthRequest, res: Response) => {
  requireObjectId(req.params.id, "alert");
  const alert = await SeoAlert.findByIdAndUpdate(
    req.params.id,
    { $set: { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: editorName(req) } },
    { new: true }
  );
  if (!alert) throw new AppError(404, "Alert not found");
  successResponse(res, alert, "Alert acknowledged");
});

// ---------- Competitors ----------

export const listCompetitors = asyncHandler(async (_req: Request, res: Response) => {
  const competitors = await SeoCompetitor.find().sort({ createdAt: 1 }).lean();
  successResponse(res, competitors.map(toCompetitorDto), "Competitors retrieved");
});

export const getCompetitorComparison = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, await auditService.getCompetitorComparison(), "Competitor comparison retrieved");
});

export const addCompetitor = asyncHandler(async (req: Request, res: Response) => {
  const url = auditService.normalizeSiteOrigin(req.body?.url);
  if (url === auditService.getSiteUrl()) throw new AppError(400, "That is the Ensis website itself");
  const label = (typeof req.body?.label === "string" && req.body.label.trim()) || new URL(url).hostname;
  if (await SeoCompetitor.exists({ url })) throw new AppError(409, "Competitor already added");
  if ((await SeoCompetitor.countDocuments()) >= 20) throw new AppError(400, "You can track at most 20 competitors");
  const competitor = await SeoCompetitor.create({ url, label: label.slice(0, 120) });
  successResponse(res, toCompetitorDto(competitor), "Competitor added", 201);
});

export const deleteCompetitor = asyncHandler(async (req: Request, res: Response) => {
  requireObjectId(req.params.id, "competitor");
  const competitor = await SeoCompetitor.findByIdAndDelete(req.params.id);
  if (!competitor) throw new AppError(404, "Competitor not found");
  await SeoAudit.deleteMany({ target: "competitor", competitor: competitor._id });
  successResponse(res, { id: req.params.id }, "Competitor deleted");
});

export const auditCompetitor = asyncHandler(async (req: Request, res: Response) => {
  requireObjectId(req.params.id, "competitor");
  const result = await auditService.startCompetitorAudit(req.params.id);
  successResponse(res, result, "Competitor audit started", 202);
});
