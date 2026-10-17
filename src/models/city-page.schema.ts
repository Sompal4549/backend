import { Schema } from 'mongoose';
import { generateSlug } from '../utils/generate-slug';

/**
 * A city landing page for a solution or product, served at
 * /solutions/:slug/:citySlug or /products/:slug/:citySlug.
 * Empty fields fall back to the parent's own content with the city name worked in.
 */
export interface ICityPage {
  _id?: unknown;
  city: string;
  slug: string;
  isActive: boolean;
  heading?: string;
  description?: string;
  intro?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export const cityPageSchema = new Schema<ICityPage>(
  {
    city: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    heading: { type: String, default: '' },
    description: { type: String, default: '' },
    intro: { type: String, default: '' },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  { _id: true }
);

/** Cleans admin input: slug from the city name when missing, duplicates and blank cities dropped. */
export const normalizeCityPages = (input: unknown): ICityPage[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const pages: ICityPage[] = [];
  for (const raw of input) {
    const city = typeof raw?.city === 'string' ? raw.city.trim() : '';
    if (!city) continue;
    const slug = generateSlug(typeof raw.slug === 'string' && raw.slug.trim() ? raw.slug : city);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    pages.push({
      ...(raw._id ? { _id: raw._id } : {}),
      city,
      slug,
      isActive: raw.isActive !== false,
      heading: text(raw.heading),
      description: text(raw.description),
      intro: text(raw.intro),
      metaTitle: text(raw.metaTitle),
      metaDescription: text(raw.metaDescription),
    });
  }
  return pages;
};
