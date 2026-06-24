// controllers/seo.controller

import { Request, Response } from "express";
import * as seoService from "../services/seo.service";

export const createSeo = async (
  req: Request,
  res: Response
) => {
  const seo = await seoService.createSeo(req.body);

  res.status(201).json({
    success: true,
    data: seo,
  });
};

export const getAllSeo = async (
  _req: Request,
  res: Response
) => {
  const seo = await seoService.getAllSeo();

  res.json({
    success: true,
    data: seo,
  });
};

export const getSeoBySlug = async (
  req: Request,
  res: Response
) => {
  const seo = await seoService.getSeoBySlug(
    req.params.slug
  );

  res.json({
    success: true,
    data: seo,
  });
};

export const updateSeo = async (
  req: Request,
  res: Response
) => {
  const seo = await seoService.updateSeo(
    req.params.id,
    req.body
  );

  res.json({
    success: true,
    data: seo,
  });
};

export const deleteSeo = async (
  req: Request,
  res: Response
) => {
  await seoService.deleteSeo(req.params.id);

  res.json({
    success: true,
  });
};

export const getAdvancedSeo = async (_req: Request, res: Response) => {
  const seo = await seoService.getSeoBySlug("advanced-seo");
  res.json({ success: true, data: seo?.advanced || null });
};

export const upsertAdvancedSeo = async (req: Request, res: Response) => {
  const { sitemap, robots, searchConsole, analytics } = req.body;
  const seo = await seoService.upsertSeoBySlug("advanced-seo", {
    "advanced.sitemap": sitemap,
    "advanced.robotsTxt": robots,
    "advanced.searchConsole": searchConsole,
    "advanced.analytics": analytics,
    title: "Advanced SEO",
    description: "Advanced SEO Settings",
  });
  res.json({ success: true, data: seo });
};