import { Schema, model, Document } from 'mongoose';

export interface IComponentContent extends Document {
  key: string;
  label: string;
  page: string;
  description?: string;
  data: Record<string, unknown>;
  isActive: boolean;
}

const componentContentSchema = new Schema<IComponentContent>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    page: { type: String, required: true, trim: true },
    description: { type: String },
    data: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

componentContentSchema.index({ page: 1, key: 1 });

export const ComponentContentModel = model<IComponentContent>('ComponentContent', componentContentSchema);
