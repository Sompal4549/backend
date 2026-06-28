// repositories/seo.repository

import Seo from "../models/seo.models";

export const createSeo = (payload: any) => {
  return Seo.create(payload);
};
export const getAllSeo = () => {
  return Seo.find();
};
export const getSeoBySlug = (slug: string) => {
  return Seo.findOne({ slug });
};
export const updateSeo = (id: string, payload: any) => {
  const flatPayload: Record<string, any> = {};

  if (payload.pageName !== undefined) flatPayload.pageName = payload.pageName;

  if (payload.seo) {
    Object.entries(payload.seo).forEach(([key, val]) => {
      flatPayload[`seo.${key}`] = val;
    });
  }

  return Seo.findByIdAndUpdate(id, { $set: flatPayload }, { new: true });
};

export const upsertSeoBySlug = (slug: string, payload: any) => {
  const flatPayload: Record<string, any> = {};

  if (payload.pageName !== undefined) flatPayload.pageName = payload.pageName;

  if (payload.seo) {
    Object.entries(payload.seo).forEach(([key, val]) => {
      flatPayload[`seo.${key}`] = val;
    });
  }

  return Seo.findOneAndUpdate(
    { slug },
    { $set: flatPayload },
    { new: true, upsert: true }
  );
};
export const deleteSeo = (id: string) => {
  return Seo.findByIdAndDelete(id);
};