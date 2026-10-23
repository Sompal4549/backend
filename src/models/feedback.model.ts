import { Schema, model, Document } from 'mongoose';

export interface IFeedback extends Document {
  role?: string;
  name: string;
  company?: string;
  designation?: string;
  phone?: string;
  email?: string;
  edition?: string;
  ratings?: {
    overall: number;
    networking: number;
    quality: number;
    management: number;
  };
  valuable?: string;
  improve?: string;
  consentToFeature?: boolean;
  wantsContact?: boolean;
  photo?: string;
  logo?: string;
  status: 'new' | 'reviewed' | 'contacted';
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    role: { type: String, default: 'Client' },
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    designation: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    edition: { type: String, default: 'Ensis 2026' },
    ratings: {
      overall: { type: Number, default: 5 },
      networking: { type: Number, default: 5 },
      quality: { type: Number, default: 5 },
      management: { type: Number, default: 5 },
    },
    valuable: { type: String },
    improve: { type: String },
    consentToFeature: { type: Boolean, default: true },
    wantsContact: { type: Boolean, default: false },
    photo: { type: String },
    logo: { type: String },
    status: { type: String, enum: ['new', 'reviewed', 'contacted'], default: 'new' },
  },
  { timestamps: true }
);

export const FeedbackModel = model<IFeedback>('Feedback', feedbackSchema);
