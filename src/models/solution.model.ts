import mongoose, { Schema, Document } from 'mongoose';

export interface ISolution extends Document {
  title: string;
  slug: string;
  isActive: boolean;
  isFeatured: boolean;
  orderBy: number;
  viewCount: number;
  robots?: string;
  hero?: {
    eyebrow: string;
    heading: string[];
    description: string;
    primaryCta: { text: string; url: string };
    secondaryCta: { text: string; url: string };
    image: string;
    imageAlt: string;
  };
  stats?: { icon: string; top: string; text: string }[];
  approach?: {
    eyebrow: string;
    heading: string;
    description: string;
    image: string;
    imageAlt: string;
  };
  spaces?: {
    eyebrow: string;
    heading: string;
    description: string;
    items: { title: string; text: string; icon: string }[];
  };
  services?: { title: string; text: string; icon: string }[];
  process?: { number: string; title: string; text: string }[];
  cta?: {
    eyebrow: string;
    heading: string[];
    description: string;
    buttonText: string;
    image: string;
    imageAlt: string;
  };
  seo?: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    canonical: string;
    ogJson: string;
    schema: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SolutionSchema = new Schema<ISolution>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    orderBy: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    robots: { type: String, default: 'index, follow' },
    hero: {
      eyebrow: String, heading: [String], description: String,
      primaryCta: { text: String, url: String }, secondaryCta: { text: String, url: String },
      image: String, imageAlt: String,
    },
    stats: [{ icon: String, top: String, text: String }],
    approach: {
      eyebrow: String, heading: String, description: String, image: String, imageAlt: String,
    },
    spaces: {
      eyebrow: String, heading: String, description: String,
      items: [{ title: String, text: String, icon: String }],
    },
    services: [{ title: String, text: String, icon: String }],
    process: [{ number: String, title: String, text: String }],
    cta: {
      eyebrow: String, heading: [String], description: String, buttonText: String, image: String, imageAlt: String,
    },
    seo: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      metaKeywords: { type: String, default: '' },
      canonical: { type: String, default: '' },
      ogJson: { type: String, default: '' },
      schema: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export const SolutionModel = mongoose.model<ISolution>('Solution', SolutionSchema);
