import mongoose, { Schema, Document } from 'mongoose';

export const GALLERY_STATUSES = ['Published', 'Draft'] as const;

export interface IGalleryItem extends Document {
  title: string;
  year: string;
  category: string;
  image: string;
  imageAlt?: string;
  uploadedBy: string;
  date: string;
  time: string;
  status: (typeof GALLERY_STATUSES)[number];
  order: number;
  size?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GalleryItemSchema = new Schema<IGalleryItem>(
  {
    title: { type: String, trim: true, default: '' },
    year: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    imageAlt: { type: String, trim: true, default: '' },
    uploadedBy: { type: String, trim: true, default: '' },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    status: { type: String, enum: GALLERY_STATUSES, default: 'Published' },
    order: { type: Number, default: 1 },
    size: { type: String, default: '' },
  },
  { timestamps: true }
);

// Highest order first = newest upload first (admin table and website use the same order)
GalleryItemSchema.index({ status: 1, order: -1, createdAt: -1 });

export const GalleryItemModel = mongoose.model<IGalleryItem>('GalleryItem', GalleryItemSchema);
