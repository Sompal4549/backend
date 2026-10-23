import mongoose, { Schema, Document } from 'mongoose';

export type IntegrationServiceKey = 'analytics' | 'searchConsole' | 'pageSpeed';

export interface IntegrationTestResult {
  ok: boolean;
  configured: boolean;
  message: string;
}

export interface IIntegrationSettings extends Document {
  key: string;
  ga4PropertyId: string;
  searchConsoleSiteUrl: string;
  /** Google service-account JSON key, AES-256-GCM encrypted (never returned to the client) */
  serviceAccountKeyEnc: string;
  serviceAccountEmail: string;
  /** PageSpeed Insights API key, AES-256-GCM encrypted (never returned to the client) */
  pagespeedApiKeyEnc: string;
  lastTest?: {
    testedAt: Date;
    results: Record<IntegrationServiceKey, IntegrationTestResult>;
  } | null;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSettingsSchema = new Schema<IIntegrationSettings>(
  {
    // Single document collection: always 'default'
    key: { type: String, required: true, unique: true, default: 'default' },
    ga4PropertyId: { type: String, default: '', trim: true },
    searchConsoleSiteUrl: { type: String, default: '', trim: true },
    serviceAccountKeyEnc: { type: String, default: '', select: false },
    serviceAccountEmail: { type: String, default: '' },
    pagespeedApiKeyEnc: { type: String, default: '', select: false },
    lastTest: { type: Schema.Types.Mixed, default: null },
    updatedBy: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const IntegrationSettingsModel = mongoose.model<IIntegrationSettings>(
  'IntegrationSettings',
  IntegrationSettingsSchema,
  'integration_settings'
);
