import mongoose, { Schema, Document } from 'mongoose';

export const FAQ_STATUSES = ['Published', 'Draft'] as const;
export const FAQ_VISIBILITIES = ['Public', 'Members Only', 'Internal'] as const;

export interface IFaq extends Document {
  question: string;
  answer: string;
  shortAnswer?: string;
  category: string;
  status: (typeof FAQ_STATUSES)[number];
  visibility: (typeof FAQ_VISIBILITIES)[number];
  isFeatured: boolean;
  orderBy: number;
  views: number;
  votes: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FaqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true, trim: true, maxlength: 200 },
    answer: { type: String, required: true, trim: true, maxlength: 2000 },
    shortAnswer: { type: String, trim: true, maxlength: 160, default: '' },
    category: { type: String, trim: true, default: 'General' },
    status: { type: String, enum: FAQ_STATUSES, default: 'Published' },
    visibility: { type: String, enum: FAQ_VISIBILITIES, default: 'Public' },
    isFeatured: { type: Boolean, default: false },
    orderBy: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

FaqSchema.index({ status: 1, visibility: 1, orderBy: 1 });

export const FaqModel = mongoose.model<IFaq>('Faq', FaqSchema);
