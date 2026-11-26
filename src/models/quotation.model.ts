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

export interface IQuotationConversation {
  ownerType: 'ai' | 'human';
  ownerName: string;
  ownershipVersion: number;
  humanTakeover: boolean;
  replied: boolean;
  optedOutChannels: string[];
  preferredWindow?: {
    startHour: number;
    endHour: number;
    timezone: string;
  };
  frequencyCount24h: number;
  lastOutboundAt?: string;
  chatStatus: 'open' | 'resolved';
  resolvedIsNotWonSale: boolean;
  orderConfirmed: boolean;
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
  installation: number;
  advancePercent: number;
  terms: IQuotationTerms;
  revisionReason?: string;
  revisions: IQuotationRevision[];
  totalAmount?: number;
  priceListVersion?: string;
  rateValidUntil?: string;
  customScope?: boolean;
  costingApproved?: boolean;
  specChanged?: boolean;
  approvedSnapshotHash?: string;
  reviewer?: string;
  approvedBy?: string;
  approvedAt?: string;
  costingTaskId?: string;
  sendBlockedReasons?: string[];
  sentVia?: string;
  sentTo?: string;
  sentCc?: string;
  sentAt?: string;
  sentSubject?: string;
  sentMessage?: string;
  orderLinkedId?: string;
  deliveryTrace?: Array<Record<string, any>>;
  conversation?: IQuotationConversation;
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
    installation: { type: Number, default: 0 },
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
    priceListVersion: { type: String, default: 'Equipment / V2026.11' },
    rateValidUntil: { type: String, default: '' },
    customScope: { type: Boolean, default: false },
    costingApproved: { type: Boolean, default: false },
    specChanged: { type: Boolean, default: false },
    approvedSnapshotHash: { type: String, default: '' },
    reviewer: { type: String, default: '' },
    approvedBy: { type: String, default: '' },
    approvedAt: { type: String, default: '' },
    costingTaskId: { type: String, default: '' },
    sendBlockedReasons: { type: [String], default: [] },
    sentVia: { type: String, default: '' },
    sentTo: { type: String, default: '' },
    sentCc: { type: String, default: '' },
    sentAt: { type: String, default: '' },
    sentSubject: { type: String, default: '' },
    sentMessage: { type: String, default: '' },
    orderLinkedId: { type: String, default: '' },
    deliveryTrace: { type: [Schema.Types.Mixed], default: [] },
    conversation: {
      type: {
        ownerType: { type: String, enum: ['ai', 'human'], default: 'human' },
        ownerName: { type: String, default: '' },
        ownershipVersion: { type: Number, default: 1 },
        humanTakeover: { type: Boolean, default: false },
        replied: { type: Boolean, default: false },
        optedOutChannels: { type: [String], default: [] },
        preferredWindow: {
          startHour: { type: Number, default: 9 },
          endHour: { type: Number, default: 20 },
          timezone: { type: String, default: 'Asia/Kolkata' },
        },
        frequencyCount24h: { type: Number, default: 0 },
        lastOutboundAt: { type: String, default: '' },
        chatStatus: { type: String, enum: ['open', 'resolved'], default: 'open' },
        resolvedIsNotWonSale: { type: Boolean, default: true },
        orderConfirmed: { type: Boolean, default: false },
      },
      default: undefined,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const QuotationModel = mongoose.model<IQuotation>('Quotation', QuotationSchema);
