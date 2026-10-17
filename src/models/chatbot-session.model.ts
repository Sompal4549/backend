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
  /** When the lead's mobile number was verified with the WhatsApp OTP */
  phoneVerifiedAt?: Date;
  /** Website page the chat was started from */
  pageUrl?: string;
  visitor?: { ip?: string; userAgent?: string };
  /** "manual" = enquiry added by hand in the admin's Inbox & Leads */
  source: 'chat' | 'manual';
  manual?: { channel?: string; category?: string; type?: string; topic?: string; detail?: string; email?: string };
  /** The Website Enquiries record created from the chat's callback form */
  enquiryId?: string;
  /** The team's follow-up on this chat (assignment, status, notes), owned by the admin */
  workflow?: Record<string, unknown>;
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
    phoneVerifiedAt: { type: Date },
    pageUrl: { type: String, trim: true },
    visitor: { ip: String, userAgent: String },
    source: { type: String, enum: ['chat', 'manual'], default: 'chat' },
    manual: { channel: String, category: String, type: { type: String }, topic: String, detail: String, email: String },
    enquiryId: { type: String },
    workflow: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const ChatbotSessionModel = model<IChatbotSession>('ChatbotSession', chatbotSessionSchema);
