// repositories/seo.repository

import Seo from "../models/seo.models";

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

export const upsertSeoBySlug = (slug: string, payload: any) => {
  return Seo.findOneAndUpdate(
    { pageSlug: slug },
    { $set: payload },
    { new: true, upsert: true }
  );
};

export const deleteSeo = (id: string) => {
  return Seo.findByIdAndDelete(id);
};