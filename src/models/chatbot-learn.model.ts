import mongoose, { Document, Schema } from 'mongoose';

export interface IChatLearnItem extends Document {
  key: string;
  question: string;
  normalizedQuestion: string;
  asked: number;
  visitorMessage: string;
  botReply: string;
  language: string;
  status: 'pending' | 'drafted' | 'approved' | 'dismissed' | 'needs_content';
  draftAnswer?: {
    en?: string;
    hi?: string;
    reference?: string;
  };
  confidence?: number;
  sessionIds: string[];
  lastAskedAt: Date;
  feedback: {
    thumbsUp: number;
    thumbsDown: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const chatLearnSchema = new Schema<IChatLearnItem>(
  {
    key: { type: String, required: true, unique: true, index: true },
    question: { type: String, required: true, trim: true },
    normalizedQuestion: { type: String, required: true, index: true, trim: true },
    asked: { type: Number, default: 1, min: 1 },
    visitorMessage: { type: String, default: '', trim: true },
    botReply: { type: String, default: '', trim: true },
    language: { type: String, default: 'en' },
    status: {
      type: String,
      enum: ['pending', 'drafted', 'approved', 'dismissed', 'needs_content'],
      default: 'pending',
      index: true,
    },
    draftAnswer: {
      en: { type: String, trim: true },
      hi: { type: String, trim: true },
      reference: { type: String, trim: true },
    },
    confidence: { type: Number, default: 0 },
    sessionIds: { type: [String], default: [] },
    lastAskedAt: { type: Date, default: Date.now },
    feedback: {
      thumbsUp: { type: Number, default: 0 },
      thumbsDown: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const ChatLearnModel =
  mongoose.models.ChatLearn || mongoose.model<IChatLearnItem>('ChatLearn', chatLearnSchema);
