// repositories/seo.repository

import Seo from "../models/seo.models";

const flattenPayload = (payload: any): Record<string, any> => {
  const flat: Record<string, any> = {};

  if (payload.pageName !== undefined) flat.pageName = payload.pageName;

  Object.entries(payload).forEach(([key, val]) => {
    if (key === "pageName" || key === "seo") return;

    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      !key.includes(".")
    ) {
      Object.entries(val).forEach(([k, v]) => {
        flat[`${key}.${k}`] = v;
      });
    } else {
      flat[key] = val;
    }
  });

  if (payload.seo) {
    Object.entries(payload.seo).forEach(([key, val]) => {
      flat[`seo.${key}`] = val;
    });
  }

  return flat;
};

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
  const flatPayload = flattenPayload(payload);

  return Seo.findByIdAndUpdate(id, { $set: flatPayload }, { new: true });
};

export const upsertSeoBySlug = (slug: string, payload: any) => {
  const flatPayload = flattenPayload(payload);

  return Seo.findOneAndUpdate(
    { slug },
    { $set: flatPayload },
    { new: true, upsert: true }
  );
};
export const deleteSeo = (id: string) => {
  return Seo.findByIdAndDelete(id);
};