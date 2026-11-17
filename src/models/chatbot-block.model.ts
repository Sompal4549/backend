import mongoose, { Schema, Document } from 'mongoose';

export interface IChatBlock extends Document {
  ip: string;
  strikes: number;
  lastStrikeAt?: Date;
  blockedUntil?: Date;
  reason?: string;
  sessionId?: string;
  lastMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatBlockSchema = new Schema<IChatBlock>(
  {
    ip: { type: String, required: true, unique: true, index: true },
    strikes: { type: Number, default: 0 },
    lastStrikeAt: { type: Date },
    blockedUntil: { type: Date, index: true },
    reason: { type: String, trim: true },
    sessionId: { type: String, trim: true },
    lastMessage: { type: String, trim: true },
  },
  { timestamps: true }
);

export const ChatBlockModel = mongoose.model<IChatBlock>('ChatBlock', chatBlockSchema);

