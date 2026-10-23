import { Schema, model, Document } from 'mongoose';

export interface ISystemService extends Document {
  category: string;
  name: string;
  provider?: string;
  accountIdentifier?: string;
  loginUrl?: string;
  secretLabel?: string;
  secretValue?: string;
  startDate?: Date;
  expiryDate?: Date;
  autoRenews?: boolean;
  notes?: string;
  details?: Record<string, string>;
  popupReminderDays?: number;
  emailReminderDays?: number;
  notifyEmails?: string[];
  remindersEnabled?: boolean;
  pricingType: 'FREE' | 'PAID';
  costAmount?: number;
  currency?: string;
  billingCycle?: string;
  receipts?: Array<{ fileName: string; fileUrl: string; uploadedAt: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const systemServiceSchema = new Schema<ISystemService>(
  {
    category: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    provider: { type: String, trim: true },
    accountIdentifier: { type: String, trim: true },
    loginUrl: { type: String, trim: true },
    secretLabel: { type: String, trim: true },
    secretValue: { type: String },
    startDate: { type: Date },
    expiryDate: { type: Date },
    autoRenews: { type: Boolean, default: true },
    notes: { type: String },
    details: { type: Schema.Types.Mixed, default: {} },
    popupReminderDays: { type: Number, default: 30 },
    emailReminderDays: { type: Number, default: 15 },
    notifyEmails: [{ type: String }],
    remindersEnabled: { type: Boolean, default: true },
    pricingType: { type: String, enum: ['FREE', 'PAID'], default: 'PAID' },
    costAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    billingCycle: { type: String, default: 'YEARLY' },
    receipts: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        uploadedAt: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const SystemServiceModel = model<ISystemService>('SystemService', systemServiceSchema);
