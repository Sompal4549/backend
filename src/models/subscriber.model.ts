import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriber extends Document {
  email: string;
  isActive: boolean;
}

const SubscriberSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const SubscriberModel = mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);