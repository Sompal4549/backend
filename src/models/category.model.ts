import { Schema, model, Document } from 'mongoose';
import slugify from 'slugify';

export interface ICategory extends Document {
  name: string;
  slug: string; // URL-friendly identifier, unique
  image?: string;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    image: { type: String, trim: true },
  },
  { timestamps: true }
);

// Generate slug from name before validation
categorySchema.pre<ICategory>('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

export const CategoryModel = model<ICategory>('Category', categorySchema);