import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IActivity extends Document {
  opportunityId: Types.ObjectId;
  type: string;
  title: string;
  detail: string;
  by: string;
  tone: string;
}

export interface IOpportunity extends Document {
  id: string;
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
  nextAction?: {
    kind: string;
    label: string;
    when: string;
    tone: string;
  };
  latestQuotation?: {
    id: string;
    revision: string;
    sentOn: string;
    value: string;
    status: { label: string; tone: string };
  };
  activity: Array<{
    id: string;
    title: string;
    by: string;
    at: string;
    detail: string;
    tone: 'success' | 'neutral';
  }>;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

const opportunitySchema = new Schema<IOpportunity>(
  {
    id: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    client: { type: String, required: true, trim: true },
    contact: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    value: { type: String, required: true, trim: true },
    stage: {
      type: String,
      default: 'requirement',
      index: true,
    },
    owner: { type: String, required: true, trim: true },
    salesTeam: { type: String, default: '', trim: true },
    expectedClose: { type: String, default: '', trim: true },
    businessType: { type: String, default: '', trim: true },
    linkedLead: { type: String, default: '', trim: true },
    scope: { type: String, default: '', trim: true },
    nextAction: {
      kind: { type: String, default: 'call' },
      label: { type: String, default: '' },
      when: { type: String, default: '' },
      tone: { type: String, default: 'neutral' },
    },
    latestQuotation: {
      id: { type: String, default: '' },
      revision: { type: String, default: '' },
      sentOn: { type: String, default: '' },
      value: { type: String, default: '' },
      status: {
        label: { type: String, default: '' },
        tone: { type: String, default: 'neutral' },
      },
    },
    activity: [
      {
        id: String,
        title: String,
        by: String,
        at: String,
        detail: String,
        tone: {
          type: String,
          default: 'neutral',
        },
      },
    ],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const OpportunityModel =
  (mongoose.models.Opportunity as mongoose.Model<IOpportunity>) ||
  model<IOpportunity>('Opportunity', opportunitySchema);

export const ActivityModel =
  (mongoose.models.Activity as mongoose.Model<IActivity>) ||
  model<IActivity>(
    'Activity',
    new Schema(
      {
        opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true },
        type: String,
        title: String,
        detail: String,
        by: String,
        tone: String,
      },
      { timestamps: true }
    )
  );
