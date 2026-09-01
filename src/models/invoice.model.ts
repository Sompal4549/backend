import { Schema, model, Document, Types } from 'mongoose';

export interface IInvoiceItem {
  product?: Types.ObjectId;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  amount: number;
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
  },
  { timestamps: true }
);

invoiceSchema.index({ lead: 1, createdAt: -1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ type: 1 });

export const InvoiceModel = model<IInvoice>('Invoice', invoiceSchema);
