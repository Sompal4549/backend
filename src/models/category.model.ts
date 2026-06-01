import { Schema, model, Document } from 'mongoose';
import { generateSlug } from '../utils/generate-slug';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
  },
  { timestamps: true }
);

categorySchema.pre<ICategory>('save', function (next) {
  if (!this.slug) {
    this.slug = generateSlug(this.name);
  }
  next();
});

export const CategoryModel = model<ICategory>('Category', categorySchema);
