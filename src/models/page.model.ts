import mongoose, { Schema, Document } from 'mongoose';

export interface IPage extends Document {
  pageName: string;
  slug: string; // The URL path, e.g., '/' for home
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords?: string;
    h1: string;
    canonical?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    schemaMarkup?: string;
    breadcrumbs?: any[];
    internalLinks?: string;
  };
  bannerSize?: string;
  advanceSeo?: {
    headCode?: string; // For GA, GTM, or custom scripts in <head>
    bodyCode?: string; // For custom scripts after <body>
  };
  robots?: string;
  faqs?: Array<{ question: string; answer: string }>;
}

const PageSchema: Schema = new Schema(
  {
    pageName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    seo: {
      metaTitle: { type: String, required: true },
      metaDescription: { type: String, required: true },
      metaKeywords: { type: String },
      h1: { type: String, required: true },
      canonical: { type: String },
      ogTitle: { type: String },
      ogDescription: { type: String },
      ogImage: { type: String },
      schemaMarkup: { type: String },
      breadcrumbs: { type: [Schema.Types.Mixed] },
      internalLinks: { type: String },
    },
    bannerSize: { type: String },
    advanceSeo: {
      headCode: { type: String },
      bodyCode: { type: String },
    },
    robots: {
      type: String,
      enum: ['index, follow', 'noindex, nofollow', 'index, nofollow', 'noindex, follow'],
      default: 'index, follow',
    },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

const Page = mongoose.model<IPage>('Page', PageSchema);
export default Page;