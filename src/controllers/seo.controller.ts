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
  const { sitemap, robots, searchConsole, analytics } = req.body;
  const seo = await seoService.upsertSeoBySlug("advanced-seo", {
    "advanced.sitemap": sitemap,
    "advanced.robotsTxt": robots,
    "advanced.searchConsole": searchConsole,
    "advanced.analytics": analytics,
    title: "Advanced SEO",
    description: "Advanced SEO Settings",
  });
  successResponse(res, seo, "Advanced SEO updated");
});
