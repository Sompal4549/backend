import mongoose, { Schema, Document } from 'mongoose';

export interface IPage extends Document {
  pageName: string;
  slug: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords?: string;
    canonical?: string;
    ogJson?: string;    // 👈 add
    schema?: string;    // 👈 add
    // purane fields hata do ya rakho — but admin inhi 2 ko use karta hai
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
    pageName: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    seo: {
      metaTitle: { type: String, required: true },
      metaDescription: { type: String, required: true },
      metaKeywords: { type: String },
      canonical: { type: String },
      ogJson: { type: String },    // 👈 add
      schema: { type: String },    // 👈 add
    },
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