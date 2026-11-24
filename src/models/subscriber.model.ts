import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriber extends Document {
  name?: string;
  email: string;
  phone?: string;
  type: 'blog' | 'career' | 'product';
  source?: string;
  language?: string;
  status?: 'Active' | 'Inactive' | 'Unsubscribed';
  interests?: string[];
  frequency?: string;
  notes?: string;
  consent?: boolean;
  isActive: boolean;
}

const SubscriberSchema: Schema = new Schema({
  name: { type: String, default: '', trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  type: { type: String, enum: ['blog', 'career', 'product'], default: 'blog' },
  source: { type: String, default: '' },
  language: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Inactive', 'Unsubscribed'], default: 'Active' },
  interests: [{ type: String }],
  frequency: { type: String, default: 'all' },
  notes: { type: String, default: '' },
  consent: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const SubscriberModel = mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
