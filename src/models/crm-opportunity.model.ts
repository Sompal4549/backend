import { Schema, model, Document, Types } from 'mongoose';

export interface IOpportunity extends Document {
  title: string;
  client: string;
  contact: string;
  city: string;
  value: string;
  stage: string;
  owner: string;
  salesTeam: string;
  expectedClose: string;
  businessType: string;
  linkedLead: string;
  scope: string;
  latestQuotation: { id: string; revision: string; sentOn: string; value: string; status: { label: string; tone: string } };
  activity: Array<{ id: string; title: string; by: string; at: string; detail: string; tone: string }>;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

const opportunitySchema = new Schema<IOpportunity>(
  {
    title: { type: String, required: true, trim: true },
    client: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    stage: { type: String, enum: ['requirement', 'proposal', 'quotation', 'negotiation'], default: 'requirement', index: true },
    owner: { type: String, required: true, trim: true },
    salesTeam: { type: String, default: '', trim: true },
    expectedClose: { type: String, default: '', trim: true },
    businessType: { type: String, default: '', trim: true },
    linkedLead: { type: String, default: '', trim: true },
    scope: { type: String, default: '', trim: true },
    latestQuotation: {
      id: { type: String, default: '' },
      revision: { type: String, default: '' },
      sentOn: { type: String, default: '' },
      value: { type: String, default: '' },
      status: { label: String, tone: String },
    },
    activity: [
      {
        id: String,
        title: String,
        by: String,
        at: String,
        detail: String,
        tone: { type: String, enum: ['success', 'neutral'], default: 'neutral' },
      },
    ],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const OpportunityModel = model<IOpportunity>('Opportunity', opportunitySchema);

export interface IActivity extends Document {
  opportunityId: Types.ObjectId;
  type: string;
  title: string;
  detail: string;
  by: string;
  tone: string;
}

const activitySchema = new Schema<IActivity>(
  {
    opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    detail: { type: String, required: true },
    by: { type: String, required: true },
    tone: { type: String, default: 'neutral' },
  },
  { timestamps: true }
);

export const ActivityModel = model<IActivity>('Activity', activitySchema);