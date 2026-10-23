import mongoose, { Schema, Document, Types } from 'mongoose';

/*
 * Events & Stalls manager (Add by Admin → Dropdowns → Events & Stalls; ensis-admin lib/expoApi.ts).
 * Ported in minimal form from the Organic Expo backend so the admin tab works.
 */

export interface IPaymentPlan {
  id: string;
  label: string;
  percentage: number;
}

export interface IExpoEvent extends Document {
  name: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  city: string;
  isActive: boolean;
  paymentPlans: IPaymentPlan[];
  createdAt: Date;
  updatedAt: Date;
}

const PaymentPlanSchema = new Schema<IPaymentPlan>(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    percentage: { type: Number, required: true, min: 1, max: 100 },
  },
  { _id: false }
);

const ExpoEventSchema = new Schema<IExpoEvent>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    venue: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true, index: true },
    paymentPlans: { type: [PaymentPlanSchema], default: [{ id: 'full', label: 'Full Payment', percentage: 100 }] },
  },
  { timestamps: true }
);

export const ExpoEventModel = mongoose.model<IExpoEvent>('ExpoEvent', ExpoEventSchema);

export const STALL_STATUSES = ['available', 'reserved', 'booked', 'blocked'] as const;
export type StallStatus = (typeof STALL_STATUSES)[number];

export interface IStall extends Document {
  event: Types.ObjectId;
  stallNumber: string;
  hall: string;
  stallType: string;
  length: number;
  width: number;
  area: number;
  plScheme: string;
  incrementPercentage: number;
  discountPercentage: number;
  status: StallStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const StallSchema = new Schema<IStall>(
  {
    event: { type: Schema.Types.ObjectId, ref: 'ExpoEvent', required: true, index: true },
    stallNumber: { type: String, required: true, trim: true, maxlength: 30 },
    hall: { type: String, default: '', trim: true },
    stallType: { type: String, required: true, trim: true },
    length: { type: Number, required: true, min: 0.5 },
    width: { type: Number, required: true, min: 0.5 },
    area: { type: Number, required: true, min: 0 },
    plScheme: { type: String, default: 'One Side Open', trim: true },
    incrementPercentage: { type: Number, default: 0, min: 0, max: 100 },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: STALL_STATUSES, default: 'available', index: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

StallSchema.index({ event: 1, stallNumber: 1 }, { unique: true });

export const StallModel = mongoose.model<IStall>('Stall', StallSchema);

export const STALL_CURRENCIES = ['INR', 'USD'] as const;

export interface IStallRate extends Document {
  event: Types.ObjectId;
  stallType: string;
  currency: (typeof STALL_CURRENCIES)[number];
  ratePerSqm: number;
  createdAt: Date;
  updatedAt: Date;
}

const StallRateSchema = new Schema<IStallRate>(
  {
    event: { type: Schema.Types.ObjectId, ref: 'ExpoEvent', required: true, index: true },
    stallType: { type: String, required: true, trim: true },
    currency: { type: String, enum: STALL_CURRENCIES, required: true },
    ratePerSqm: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

StallRateSchema.index({ event: 1, stallType: 1, currency: 1 }, { unique: true });

export const StallRateModel = mongoose.model<IStallRate>('StallRate', StallRateSchema);
