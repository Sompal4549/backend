import mongoose, { Schema, Document } from 'mongoose';

export const VIDEO_TYPES = ['youtube', 'instagram', 'upload'] as const;
export const VIDEO_HIGHLIGHT_STATUSES = ['Published', 'Draft'] as const;

export interface IVideoHighlight extends Document {
  title: string;
  category: string;
  videoType: (typeof VIDEO_TYPES)[number];
  videoUrl: string;
  thumbnail: string;
  objectPosition: string;
  status: (typeof VIDEO_HIGHLIGHT_STATUSES)[number];
  order: number;
  uploadedBy: string;
  date: string;
  time: string;
  createdAt: Date;
  updatedAt: Date;
}

const VideoHighlightSchema = new Schema<IVideoHighlight>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: '' },
    videoType: { type: String, enum: VIDEO_TYPES, default: 'youtube' },
    videoUrl: { type: String, required: true, trim: true },
    thumbnail: { type: String, default: '' },
    objectPosition: { type: String, default: 'center 10%' },
    status: { type: String, enum: VIDEO_HIGHLIGHT_STATUSES, default: 'Published' },
    order: { type: Number, default: 1 },
    uploadedBy: { type: String, default: '' },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
  },
  { timestamps: true }
);

VideoHighlightSchema.index({ status: 1, order: -1, createdAt: -1 });

export const VideoHighlightModel = mongoose.model<IVideoHighlight>('VideoHighlight', VideoHighlightSchema);
