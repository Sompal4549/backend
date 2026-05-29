import { Schema, model, Document } from 'mongoose';

export const OTP_CHANNEL = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
} as const;

export interface IOtp extends Document {
  channel: typeof OTP_CHANNEL[keyof typeof OTP_CHANNEL];
  target: string;
  purpose: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  consumedAt?: Date;
}

const otpSchema = new Schema<IOtp>(
  {
    channel: { type: String, enum: Object.values(OTP_CHANNEL), required: true },
    target: { type: String, required: true, trim: true, lowercase: true },
    purpose: { type: String, required: true, trim: true, default: 'verification' },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, required: true, default: 0 },
    maxAttempts: { type: Number, required: true },
    consumedAt: { type: Date },
  },
  { timestamps: true }
);

otpSchema.index({ channel: 1, target: 1, purpose: 1, consumedAt: 1, createdAt: -1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export const OtpModel = model<IOtp>('Otp', otpSchema);
