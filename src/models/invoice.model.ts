import { Schema, model, Document, Types } from 'mongoose';

export interface IInvoiceItem {
  product?: Types.ObjectId;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  amount: number;
  hsn?: string;
  sac?: string;
  size?: string;
  area?: string;
  unit?: string;
  discount?: number;
}

export interface IPurchaseOrder {
  available: boolean;
  poNumber?: string;
  poDate?: Date;
  poFile?: string;
}

export interface IPaymentDetails {
  paymentStatus: 'payment_received' | 'full_payment_pending' | 'partially_paid';
  paymentTerms?: string;
  outstandingAmount?: number;
  amountReceived?: number;
  tdsApplicable?: boolean;
  tdsRate?: number;
}

export interface IDeliveryChallanItem {
  name: string;
  quantity: number;
  delivered: number;
  available: number;
  thisChallan: number;
}

export interface IDeliveryChallan {
  challanNumber: string;
  challanDate: Date;
  sourceInvoice: Types.ObjectId;
  items: IDeliveryChallanItem[];
  status: 'pending' | 'delivered' | 'cancelled';
}

export interface IInvoiceAddress {
  name: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  gstNumber?: string;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  type: 'proforma' | 'tax' | 'credit_note' | 'debit_note' | 'delivery_challan';
  lead: Types.ObjectId;
  order?: Types.ObjectId;
  items: IInvoiceItem[];
  billingAddress: IInvoiceAddress;
  shippingAddress?: IInvoiceAddress;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
  paymentReceived: number;
  paymentDate?: Date;
  dueDate?: Date;
  notes?: string;
  termsAndConditions?: string;
  createdBy: Types.ObjectId;
  purchaseOrder?: IPurchaseOrder;
  paymentDetails?: IPaymentDetails;
  deliveryChallans?: IDeliveryChallan[];
  sourceProformaInvoice?: Types.ObjectId;
}

const invoiceItemSchema = new Schema<IInvoiceItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    gstRate: { type: Number, default: 5 },
    amount: { type: Number, required: true },
    hsn: { type: String },
    sac: { type: String },
    size: { type: String },
    area: { type: String },
    unit: { type: String, default: 'Nos' },
    discount: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceAddressSchema = new Schema<IInvoiceAddress>(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    addressLine: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
    gstNumber: { type: String },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    available: { type: Boolean, default: false },
    poNumber: { type: String },
    poDate: { type: Date },
    poFile: { type: String },
  },
  { _id: false }
);

const paymentDetailsSchema = new Schema<IPaymentDetails>(
  {
    paymentStatus: {
      type: String,
      enum: ['payment_received', 'full_payment_pending', 'partially_paid'],
      default: 'full_payment_pending',
    },
    paymentTerms: { type: String },
    outstandingAmount: { type: Number, default: 0 },
    amountReceived: { type: Number, default: 0 },
    tdsApplicable: { type: Boolean, default: false },
    tdsRate: { type: Number, default: 0 },
  },
  { _id: false }
);

const deliveryChallanItemSchema = new Schema<IDeliveryChallanItem>(
  {
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    delivered: { type: Number, default: 0 },
    available: { type: Number, required: true },
    thisChallan: { type: Number, required: true },
  },
  { _id: false }
);

const deliveryChallanSchema = new Schema<IDeliveryChallan>(
  {
    challanNumber: { type: String, required: true },
    challanDate: { type: Date, required: true },
    sourceInvoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    items: [deliveryChallanItemSchema],
    status: {
      type: String,
      enum: ['pending', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['proforma', 'tax', 'credit_note', 'debit_note', 'delivery_challan'],
      default: 'tax',
    },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    items: [invoiceItemSchema],
    billingAddress: { type: invoiceAddressSchema, required: true },
    shippingAddress: { type: invoiceAddressSchema },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
      default: 'draft',
    },
    paymentReceived: { type: Number, default: 0 },
    paymentDate: { type: Date },
    dueDate: { type: Date },
    notes: { type: String, default: '' },
    termsAndConditions: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    purchaseOrder: { type: purchaseOrderSchema },
    paymentDetails: { type: paymentDetailsSchema },
    deliveryChallans: [deliveryChallanSchema],
    sourceProformaInvoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true }
);

invoiceSchema.index({ lead: 1, createdAt: -1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ type: 1 });

export const InvoiceModel = model<IInvoice>('Invoice', invoiceSchema);
