import mongoose, { Schema, Document } from 'mongoose';

export const GALLERY_META_KEY = 'default_gallery_config';

export interface IGalleryMeta extends Document {
  key: string;
  categories: string[];
  years: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GalleryMetaSchema = new Schema<IGalleryMeta>(
  {
    key: { type: String, default: GALLERY_META_KEY, unique: true, trim: true },
    categories: { type: [String], default: [] },
    years: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const GalleryMetaModel = mongoose.model<IGalleryMeta>('GalleryMeta', GalleryMetaSchema);
