import { Schema, model, Document, Types } from 'mongoose';

export interface IProductBackup extends Document {
  productId: Types.ObjectId;
  snapshot: Record<string, any>;
  backedUpAt: Date;
  backedUpBy?: Types.ObjectId;
  note?: string;
}

const productBackupSchema = new Schema<IProductBackup>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    backedUpAt: { type: Date, default: Date.now },
    backedUpBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { timestamps: false }
);

// Keep only latest 20 backups per product (TTL via capped-like cleanup done in service)
productBackupSchema.index({ productId: 1, backedUpAt: -1 });

export const ProductBackupModel = model<IProductBackup>('ProductBackup', productBackupSchema);
