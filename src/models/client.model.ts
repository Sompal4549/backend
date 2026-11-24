import { Schema, model, Document, Types } from 'mongoose';

export interface IClient extends Document {
  name: string;
  contact: string;
  phone: string;
  email: string;
  type: string;
  city: string;
  owner: string;
  outstanding: string;
  nextFollowUp?: { date?: string; time?: string; overdue?: boolean };
  linkedLeadId?: Types.ObjectId | null;
  gstin?: string;
  panNumber?: string;
  isGstRegistered?: boolean;
  gstAddress?: string;
  billingAddress?: string;
  deliverySameAsBilling?: boolean;
  consigneeName?: string;
  consigneeContact?: string;
  consigneeAddress?: string;
  consigneeGstin?: string;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

const clientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    owner: { type: String, default: '' },
    outstanding: { type: String, default: '0' },
    nextFollowUp: { date: String, time: String, overdue: Boolean },
    linkedLeadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    gstin: { type: String, default: '' },
    panNumber: { type: String, default: '' },
    isGstRegistered: { type: Boolean, default: true },
    gstAddress: { type: String, default: '' },
    billingAddress: { type: String, default: '' },
    deliverySameAsBilling: { type: Boolean, default: true },
    consigneeName: { type: String, default: '' },
    consigneeContact: { type: String, default: '' },
    consigneeAddress: { type: String, default: '' },
    consigneeGstin: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  },
  { timestamps: true }
);

clientSchema.index({ name: 'text', contact: 'text', email: 'text' });

export const ClientModel = model<IClient>('Client', clientSchema);
