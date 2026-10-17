import mongoose, { Schema } from 'mongoose';

/**
 * Chatbot Manager (admin) — one document holding the editable draft and the published copy.
 * Each section (buttons, answers, forms, rules, settings) is stored as the admin panel's own
 * JSON, so the panel can change its fields without a migration.
 */
export const CHATBOT_CONFIG_SECTIONS = ['buttons', 'answers', 'forms', 'rules', 'settings'] as const;
export type ChatbotConfigSection = (typeof CHATBOT_CONFIG_SECTIONS)[number];

export interface IChatbotConfigVersion {
  minor: number;
  note: string;
  by: string;
  date: Date;
  /** What was published, so "Restore to Draft" can bring it back (kept for the last 20 versions) */
  snapshot?: Record<string, unknown>;
}

export interface IChatbotConfig {
  key: string;
  draft: Record<string, unknown>;
  published: Record<string, unknown>;
  /** Draft differs from what is live */
  pending: boolean;
  versions: IChatbotConfigVersion[];
  createdAt: Date;
  updatedAt: Date;
}

const versionSchema = new Schema<IChatbotConfigVersion>(
  {
    minor: { type: Number, required: true },
    note: { type: String, default: '', trim: true },
    by: { type: String, default: 'Admin', trim: true },
    date: { type: Date, default: Date.now },
    snapshot: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const chatbotConfigSchema = new Schema<IChatbotConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    draft: { type: Schema.Types.Mixed, default: {} },
    published: { type: Schema.Types.Mixed, default: {} },
    pending: { type: Boolean, default: false },
    versions: { type: [versionSchema], default: [] },
  },
  { timestamps: true, minimize: false }
);

export const ChatbotConfigModel = mongoose.model<IChatbotConfig>('ChatbotConfig', chatbotConfigSchema);
