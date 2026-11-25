import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  id: string;
  name: string;
  channel: string;
  channelDetails: string;
  status: 'Scheduled' | 'Active' | 'Draft' | 'Completed';
  eligibleAudience: number;
  excludedCount: number;
  qualified: number;
  owner: string;
  action: 'Open' | 'Edit';
  templateName?: string;
  calloutText?: string;
  spend?: string;
  leads?: number;
  objective?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    id: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    channel: { type: String, required: true, trim: true },
    channelDetails: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['Scheduled', 'Active', 'Draft', 'Completed'],
      default: 'Draft',
    },
    eligibleAudience: { type: Number, default: 0 },
    excludedCount: { type: Number, default: 0 },
    qualified: { type: Number, default: 0 },
    owner: { type: String, required: true, trim: true },
    action: { type: String, enum: ['Open', 'Edit'], default: 'Open' },
    templateName: { type: String, default: '' },
    calloutText: { type: String, default: '' },
    spend: { type: String, default: '₹0.00' },
    leads: { type: Number, default: 0 },
    objective: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CampaignModel =
  mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', campaignSchema, 'campaigns');

export default CampaignModel;
