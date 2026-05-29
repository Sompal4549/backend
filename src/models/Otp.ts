import { Schema, model, Document } from 'mongoose';

export interface IGenericOtp extends Document {
  identifier: string;
  otp: string;
  type: 'email' | 'phone';
  createdAt: Date;
}

const genericOtpSchema = new Schema<IGenericOtp>({
  identifier: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['email', 'phone'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 },
});

genericOtpSchema.index({ identifier: 1, type: 1 }, { unique: true });

export const GenericOtpModel = model<IGenericOtp>('GenericOtp', genericOtpSchema);
