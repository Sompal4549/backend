import mongoose, { Document, Schema } from 'mongoose';

export interface IChatTrainingChunk {
  text: string;
  embedding?: number[];
}

export interface IChatTraining extends Document {
  kind: 'instruction' | 'note' | 'file';
  title: string;
  content: string;
  always: boolean;
  enabled: boolean;
  file?: {
    name: string;
    mime: string;
    size: number;
    pages?: number;
  };
  chunks: IChatTrainingChunk[];
  chunksHash?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatTrainingSchema = new Schema<IChatTraining>(
  {
    kind: { type: String, enum: ['instruction', 'note', 'file'], required: true },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    always: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    file: {
      name: String,
      mime: String,
      size: Number,
      pages: Number,
    },
    chunks: [
      {
        text: { type: String, default: '' },
        embedding: { type: [Number], default: [] },
      },
    ],
    chunksHash: { type: String, default: '' },
    createdBy: { type: String, default: 'admin' },
    updatedBy: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

export interface IChatKnowledge extends Document {
  url: string;
  title: string;
  text: string;
  hash: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const chatKnowledgeSchema = new Schema<IChatKnowledge>(
  {
    url: { type: String, default: '' },
    title: { type: String, default: '' },
    text: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

export interface IChatbotSettings extends Document {
  key: string;
  greeting?: any;
  ending?: any;
  contact?: any;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatbotSettingsSchema = new Schema<IChatbotSettings>(
  {
    key: { type: String, default: 'main', unique: true },
    greeting: { type: Schema.Types.Mixed, default: undefined },
    ending: { type: Schema.Types.Mixed, default: undefined },
    contact: { type: Schema.Types.Mixed, default: undefined },
    updatedBy: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

export const ChatTrainingModel =
  mongoose.models.ChatTraining || mongoose.model<IChatTraining>('ChatTraining', chatTrainingSchema);

export const ChatKnowledgeModel =
  mongoose.models.ChatKnowledge || mongoose.model<IChatKnowledge>('ChatKnowledge', chatKnowledgeSchema);

export const ChatbotSettingsModel =
  mongoose.models.ChatbotSettings || mongoose.model<IChatbotSettings>('ChatbotSettings', chatbotSettingsSchema);

