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