import mongoose, { Schema, Document } from 'mongoose';

export interface IPage extends Document {
  configKey?: string;
  pageName: string;
  slug: string;
  status?: 'Published' | 'Draft';
  visibility?: 'Public' | 'Private';
  author?: string;
  updatedBy?: string;
  publishedAt?: string;
  sections?: any[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords?: string;
    canonical?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    h1Tag?: string;
    breadcrumbName?: string;
    schema?: string;
    schemaMarkup?: string;
    robotsIndex?: boolean;
    robotsFollow?: boolean;
    ogJson?: string;
    isActive?: boolean;
  };
  advanceSeo?: {
    headCode?: string;
    bodyCode?: string;
  };
  robots?: string;
  faqs?: Array<{ question: string; answer: string }>;
}

const PageSchema: Schema = new Schema(
  {
    configKey: { type: String, index: true },
    pageName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    status: { type: String, enum: ['Published', 'Draft'], default: 'Published' },
    visibility: { type: String, default: 'Public' },
    author: { type: String, default: 'Admin' },
    updatedBy: { type: String, default: 'Admin' },
    publishedAt: { type: String },
    sections: { type: Schema.Types.Mixed, default: [] },
    seo: {
      type: Schema.Types.Mixed,
      default: {},
    },
    advanceSeo: {
      headCode: { type: String },
      bodyCode: { type: String },
    },
    robots: {
      type: String,
      default: 'index, follow',
    },
    faqs: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
    strict: false,
  }
);

const Page = mongoose.models.Page || mongoose.model<IPage>('Page', PageSchema);
export default Page;