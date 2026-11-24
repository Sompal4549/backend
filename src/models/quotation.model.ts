import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotationLine {
  id: string;
  name: string;
  spec?: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number;
  gst: number;
}

export interface IQuotationRevision {
  revision: number;
  total: number;
  createdOn: string;
  createdBy: string;
}

export interface IQuotationClient {
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  city?: string;
  gstin?: string;
}

export interface IQuotationSeller {
  name?: string;
  website?: string;
  gstin?: string;
  address?: string;
}

export interface IQuotationTerms {
  payment: string;
  delivery: string;
  freight: string;
  warranty: string;
  note: string;
}

export interface IQuotation extends Document {
  id: string;
  revision: number;
  status: string;
  approvalStatus: string;
  date: string;
  validUntil: string;
  businessType: string;
  owner: string;
  opportunity?: string;
  client: IQuotationClient;
  deliverySameAsBilling: boolean;
  deliveryAddress?: string;
  placeOfSupply?: string;
  seller?: IQuotationSeller;
  lines: IQuotationLine[];
  discount: number;
  shipping: number;
  advancePercent: number;
  terms: IQuotationTerms;
  revisionReason?: string;
  revisions: IQuotationRevision[];
  totalAmount?: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationLineSchema = new Schema<IQuotationLine>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    spec: { type: String, default: '' },
    qty: { type: Number, required: true, default: 1 },
    unit: { type: String, default: 'Nos.' },
    rate: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    gst: { type: Number, default: 18 },
  },
  { _id: false }
);

const QuotationRevisionSchema = new Schema<IQuotationRevision>(
  {
    revision: { type: Number, required: true },
    total: { type: Number, required: true },
    createdOn: { type: String, default: '' },
    createdBy: { type: String, default: '' },
  },
  { _id: false }
);

const QuotationSchema = new Schema<IQuotation>(
  {
    id: { type: String, required: true, unique: true, index: true },
    revision: { type: Number, default: 1 },
    status: { type: String, default: 'Draft' },
    approvalStatus: { type: String, default: 'Not submitted' },
    date: { type: String, required: true },
    validUntil: { type: String, default: '' },
    businessType: { type: String, default: 'Equipment' },
    owner: { type: String, default: 'Simran Kaur' },
    opportunity: { type: String, default: '' },
    client: {
      name: { type: String, required: true },
      contact: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      city: { type: String, default: '' },
      gstin: { type: String, default: '' },
    },
    deliverySameAsBilling: { type: Boolean, default: true },
    deliveryAddress: { type: String, default: '' },
    placeOfSupply: { type: String, default: 'Delhi' },
    seller: {
      name: { type: String, default: 'ENSIS' },
      website: { type: String, default: 'ensis.in' },
      gstin: { type: String, default: '07AAAAA0000A1Z5' },
      address: { type: String, default: 'Plot 14, Industrial Area, Delhi NCR' },
    },
    lines: { type: [QuotationLineSchema], default: [] },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    advancePercent: { type: Number, default: 50 },
    terms: {
      payment: { type: String, default: '50% advance, balance before dispatch' },
      delivery: { type: String, default: '2–3 weeks from advance' },
      freight: { type: String, default: 'Included' },
      warranty: { type: String, default: '1 Year Comprehensive Warranty' },
      note: { type: String, default: '' },
    },
    revisionReason: { type: String, default: '' },
    revisions: { type: [QuotationRevisionSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const QuotationModel = mongoose.model<IQuotation>('Quotation', QuotationSchema);
