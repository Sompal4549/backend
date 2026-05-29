import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  order: Types.ObjectId;
  user: Types.ObjectId;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  method?: string;
  refundId?: string;
}

const transactionSchema = new Schema<ITransaction>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created',
    },
    method: { type: String },
    refundId: { type: String },
  },
  { timestamps: true }
);

transactionSchema.index({ order: 1 });
transactionSchema.index({ user: 1 });
transactionSchema.index({ razorpayPaymentId: 1 });

export const TransactionModel = model<ITransaction>('Transaction', transactionSchema);
