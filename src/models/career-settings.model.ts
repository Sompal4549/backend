import mongoose, { Schema, Document } from 'mongoose';

export interface ICareerSettings extends Document {
  hrEmails: string[];
  defaultEligibilityThreshold: number;
  defaultPartialMatchMin: number;
  hrContact: {
    email: string;
    phone: string;
    address: string;
  };
  retentionDays: number;
  resultMessages?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CareerSettingsSchema = new Schema<ICareerSettings>(
  {
    hrEmails: {
      type: [String],
      default: ['careers@ensis.in', 'hr@ensis.in'],
    },
    defaultEligibilityThreshold: {
      type: Number,
      default: 70,
    },
    defaultPartialMatchMin: {
      type: Number,
      default: 50,
    },
    hrContact: {
      email: { type: String, default: 'careers@ensis.in' },
      phone: { type: String, default: '+91 96549 00525' },
      address: {
        type: String,
        default: 'Yashobhoomi (IICC), Sector 25, Dwarka, New Delhi 110077',
      },
    },
    retentionDays: {
      type: Number,
      default: 30,
    },
    resultMessages: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const CareerSettingsModel = mongoose.model<ICareerSettings>(
  'CareerSettings',
  CareerSettingsSchema,
  'career_settings'
);

export async function getOrCreateCareerSettings(): Promise<ICareerSettings> {
  let settings = await CareerSettingsModel.findOne();
  if (!settings) {
    settings = await CareerSettingsModel.create({
      hrEmails: ['careers@ensis.in'],
      defaultEligibilityThreshold: 70,
      defaultPartialMatchMin: 50,
      hrContact: {
        email: 'careers@ensis.in',
        phone: '+91 96549 00525',
        address: 'Yashobhoomi (IICC), Sector 25, Dwarka, New Delhi 110077',
      },
      retentionDays: 30,
    });
  }
  return settings;
}
