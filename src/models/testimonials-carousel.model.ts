import mongoose, { Schema, Document, Types } from 'mongoose';
import { VIDEO_TYPES } from './video-highlight.model';

export const TESTIMONIAL_VIDEO_STATUSES = ['Published', 'Pending Review', 'Hidden'] as const;

export interface ITestimonialVideo {
  _id?: Types.ObjectId;
  title: string;
  location: string;
  videoType: (typeof VIDEO_TYPES)[number];
  videoUrl: string;
  thumbnail: string;
  showOverlay: boolean;
  overlayGradient: string;
  status: (typeof TESTIMONIAL_VIDEO_STATUSES)[number];
  author: string;
  addedOn: string;
  date: string;
}

// Single-document collection: the admin saves the whole video list at once
export interface ITestimonialsCarousel extends Document {
  videos: ITestimonialVideo[];
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialVideoSchema = new Schema<ITestimonialVideo>(
  {
    title: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    videoType: { type: String, enum: VIDEO_TYPES, default: 'youtube' },
    videoUrl: { type: String, trim: true, default: '' },
    thumbnail: { type: String, default: '' },
    showOverlay: { type: Boolean, default: true },
    overlayGradient: { type: String, default: 'linear-gradient(160deg, #4a5568, #1a202c)' },
    status: { type: String, enum: TESTIMONIAL_VIDEO_STATUSES, default: 'Published' },
    author: { type: String, default: '' },
    addedOn: { type: String, default: '' },
    date: { type: String, default: '' },
  },
  { timestamps: true }
);

const TestimonialsCarouselSchema = new Schema<ITestimonialsCarousel>(
  {
    videos: { type: [TestimonialVideoSchema], default: [] },
  },
  { timestamps: true }
);

export const TestimonialsCarouselModel = mongoose.model<ITestimonialsCarousel>(
  'TestimonialsCarousel',
  TestimonialsCarouselSchema
);
