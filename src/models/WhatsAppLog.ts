import { Schema, model, Document } from 'mongoose';

export interface IWhatsAppLog extends Document {
  recipient: string;
  message: string;
  name?: string;
  status: 'success' | 'failed';
  error?: string;
  sentAt: Date;
}

const whatsAppLogSchema = new Schema<IWhatsAppLog>({
  recipient: { type: String, required: true },
  message: { type: String, required: true },
  name: { type: String },
  status: { type: String, enum: ['success', 'failed'], required: true },
  error: { type: String },
  sentAt: { type: Date, default: Date.now },
});

export const WhatsAppLog = model<IWhatsAppLog>('WhatsAppLog', whatsAppLogSchema);
