// controllers/seo.controller

import { Request, Response } from "express";
import * as seoService from "../services/seo.service";
import { asyncHandler } from "../utils/async-handler";
import { successResponse } from "../utils/api-response";

export const createSeo = asyncHandler(async (req: Request, res: Response) => {
  const seo = await seoService.createSeo(req.body);

  successResponse(res, seo, "SEO created", 201);
});

export const getAllSeo = asyncHandler(async (_req: Request, res: Response) => {
  const seo = await seoService.getAllSeo();

  successResponse(res, seo, "SEO retrieved");
});

export const getSeoBySlug = asyncHandler(async (req: Request, res: Response) => {
  const seo = await seoService.getSeoBySlug(
    req.params.slug
  );

  successResponse(res, seo, "SEO retrieved");
});

export const updateSeo = asyncHandler(async (req: Request, res: Response) => {
  const seo = await seoService.updateSeo(
    req.params.id,
    req.body
  );

  successResponse(res, seo, "SEO updated");
});

export const deleteSeo = asyncHandler(async (req: Request, res: Response) => {
  await seoService.deleteSeo(req.params.id);

  successResponse(res, null, "SEO deleted");
});

export const getAdvancedSeo = asyncHandler(async (_req: Request, res: Response) => {
  const seo = await seoService.getSeoBySlug("advanced-seo");
  successResponse(res, seo?.advanced || null, "Advanced SEO retrieved");
});

export const upsertAdvancedSeo = asyncHandler(async (req: Request, res: Response) => {
  const { sitemap, robots, searchConsole, analytics, headerScripts, footerScripts, allowIndex, allowFollow } = req.body || {};
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  // Only the sections sent are written, and only their known fields, so a partial save never wipes the rest
  const update: Record<string, unknown> = { title: "Advanced SEO", description: "Advanced SEO Settings" };
  if (sitemap && typeof sitemap === "object") {
    update["advanced.sitemap"] = {
      url: text(sitemap.url),
      autoGenerate: sitemap.autoGenerate !== false,
      excludePaths: text(sitemap.excludePaths),
    };
  }
  if (robots && typeof robots === "object") {
    update["advanced.robotsTxt"] = { content: typeof robots.content === "string" ? robots.content : "" };
  }
  if (searchConsole && typeof searchConsole === "object") {
    update["advanced.searchConsole"] = {
      googleVerification: text(searchConsole.googleVerification),
      bingVerification: text(searchConsole.bingVerification),
    };
  }
  if (analytics && typeof analytics === "object") {
    update["advanced.analytics"] = {
      gaId: text(analytics.gaId),
      gtmId: text(analytics.gtmId),
      fbPixelId: text(analytics.fbPixelId),
      clarityId: text(analytics.clarityId),
    };
  }
  if (typeof headerScripts === "string") {
    update["advanced.headerScripts"] = headerScripts;
  }
  if (typeof footerScripts === "string") {
    update["advanced.footerScripts"] = footerScripts;
  }
  if (typeof allowIndex === "boolean") {
    update["advanced.allowIndex"] = allowIndex;
  }
  if (typeof allowFollow === "boolean") {
    update["advanced.allowFollow"] = allowFollow;
  }
  const seo = await seoService.upsertSeoBySlug("advanced-seo", update);
  successResponse(res, seo, "Advanced SEO updated");
});
