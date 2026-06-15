import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  author: string;
  image?: string;
  featureImage?: string; // Added featureImage field
  tags?: string[];
  isActive: boolean;
  isFeatured: boolean;
  seo?: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords?: string;
    h1?: string;
    canonical?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
  robots?: string;
  viewCount: number;
  readBy: Types.ObjectId[];
}

const BlogSchema: Schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  image: { type: String },
  featureImage: { type: String }, // Added featureImage field to schema
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  seo: {
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: { type: String },
    h1: { type: String },
    canonical: { type: String },
    ogTitle: { type: String },
    ogDescription: { type: String },
    ogImage: { type: String },
  },
  robots: {
    type: String,
    enum: ['index, follow', 'noindex, nofollow', 'index, nofollow', 'noindex, follow'],
    default: 'index, follow',
  },
  viewCount: { type: Number, default: 0 },
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export const BlogModel = mongoose.model<IBlog>('Blog', BlogSchema);