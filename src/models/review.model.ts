import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  user: Types.ObjectId;
  product: Types.ObjectId;
  rating: number;
  title?: string;
  comment: string;
  /** Name shown with the review, saved when it is written (customers are Leads, admins are Users) */
  authorName?: string;
  status: 'pending' | 'approved' | 'rejected';
  verifiedBuyer: boolean;
  moderatedAt?: Date;
  moderatedBy?: Types.ObjectId;
}

const reviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    comment: { type: String, required: true },
    authorName: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    verifiedBuyer: { type: Boolean, default: false },
    moderatedAt: { type: Date },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, status: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });

export const ReviewModel = model<IReview>('Review', reviewSchema);
