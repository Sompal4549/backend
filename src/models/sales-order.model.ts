import mongoose, { Schema, Document } from 'mongoose';

export interface ISalesOrderStage {
  label: string;
  detail: string;
  state: 'done' | 'current' | 'pending';
}

export interface ISalesOrderLinkedDocument {
  label: string;
  id: string;
  note?: string;
}

export interface ISalesOrderTimeline {
  at: string;
  text: string;
  state: 'done' | 'current' | 'pending';
}

export interface ISalesOrder extends Document {
  id: string;
  status: string;
  quotationId?: string;
  quotationRevision?: number;
  orderDate: string;
  client: string;
  clientContact?: string;
  owner: string;
  dispatchDate?: string;
  deliverySite?: string;
  address?: string;
  lines: any[];
  discount: number;
  advancePercent: number;
  value?: number | string;
  stages: ISalesOrderStage[];
  linkedDocuments: ISalesOrderLinkedDocument[];
  timeline: ISalesOrderTimeline[];
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    id: { type: String, required: true, unique: true, index: true },
    status: { type: String, default: 'In Production' },
    quotationId: { type: String, default: '' },
    quotationRevision: { type: Number, default: 1 },
    orderDate: { type: String, required: true },
    client: { type: String, required: true },
    clientContact: { type: String, default: '' },
    owner: { type: String, default: 'Simran Kaur' },
    dispatchDate: { type: String, default: '' },
    deliverySite: { type: String, default: '' },
    address: { type: String, default: '' },
    lines: { type: [Schema.Types.Mixed] as any, default: [] },
    discount: { type: Number, default: 0 },
    advancePercent: { type: Number, default: 50 },
    value: { type: Schema.Types.Mixed, default: 0 },
    stages: {
      type: [
        {
          label: { type: String, required: true },
          detail: { type: String, default: '' },
          state: { type: String, enum: ['done', 'current', 'pending'], default: 'pending' },
        },
      ],
      default: [],
    },
    linkedDocuments: {
      type: [
        {
          label: { type: String, required: true },
          id: { type: String, required: true },
          note: { type: String, default: '' },
        },
      ],
      default: [],
    },
    timeline: {
      type: [
        {
          at: { type: String, default: '' },
          text: { type: String, required: true },
          state: { type: String, enum: ['done', 'current', 'pending'], default: 'pending' },
        },
      ],
      default: [],
    },
    notes: { type: String, default: '' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SalesOrderModel = mongoose.model<ISalesOrder>('SalesOrder', SalesOrderSchema);
