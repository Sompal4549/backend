// repositories/seo.repository.ts

import Seo from "../models/seo.models.ts";

export const createSeo = (payload: any) => {
  return Seo.create(payload);
};

export const getSeoBySlug = (slug: string) => {
  return Seo.findOne({ pageSlug: slug });
};

export const getAllSeo = () => {
  return Seo.find();
};

export const updateSeo = (id: string, payload: any) => {
  return Seo.findByIdAndUpdate(id, payload, {
    new: true,
  });
};

export const deleteSeo = (id: string) => {
  return Seo.findByIdAndDelete(id);
};