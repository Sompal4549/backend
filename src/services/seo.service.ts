// services/seo.service

import * as seoRepo from "../repositories/seo.repository";

export const createSeo = async (payload: any) => {
  return seoRepo.createSeo(payload);
};

export const getSeoBySlug = async (slug: string) => {
  return seoRepo.getSeoBySlug(slug);
};

export const getAllSeo = async () => {
  return seoRepo.getAllSeo();
};

export const updateSeo = async (
  id: string,
  payload: any
) => {
  return seoRepo.updateSeo(id, payload);
};

export const deleteSeo = async (id: string) => {
  return seoRepo.deleteSeo(id);
};
export const upsertSeoBySlug = (slug: string, payload: any) => {
  return seoRepo.upsertSeoBySlug(slug, payload);
};