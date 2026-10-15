import { Schema, model, Document } from 'mongoose';

export interface IChatbotMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatbotSession extends Document {
  sessionId: string;
  userName?: string;
  phone?: string;
  messages: IChatbotMessage[];
  capturedLead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IChatbotMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatbotSessionSchema = new Schema<IChatbotSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userName: { type: String, trim: true },
    phone: { type: String, trim: true },
    messages: { type: [messageSchema], default: [] },
    capturedLead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ChatbotSessionModel = model<IChatbotSession>('ChatbotSession', chatbotSessionSchema);