import mongoose, { Schema, Document } from 'mongoose';

export interface IRedirect extends Document {
  /** Website path that is redirected, e.g. /old-page (always starts with "/") */
  source: string;
  /** Website path (/new-page) or absolute http(s) URL */
  destination: string;
  /** true = 301 Permanent, false = 302 Temporary */
  permanent: boolean;
  isActive: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RedirectSchema = new Schema<IRedirect>(
  {
    source: { type: String, required: true, trim: true, maxlength: 500 },
    destination: { type: String, required: true, trim: true, maxlength: 1000 },
    permanent: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

// One redirect per source path
RedirectSchema.index({ source: 1 }, { unique: true });
RedirectSchema.index({ isActive: 1 });

export const RedirectModel = mongoose.model<IRedirect>('Redirect', RedirectSchema);
