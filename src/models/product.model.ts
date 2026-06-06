import { Schema, model, Document, Types } from 'mongoose';
import { generateSlug } from '../utils/generate-slug.ts';

export interface IProductVariant {
  color?: string;
  size?: string;
  sku?: string;
  stock: number;
  price: number;
}

export interface IProduct extends Document {
  title: string;
  slug: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: Types.ObjectId;
  subCategory?: Types.ObjectId;
  images: string[];
  stock: number;
  averageRating: number;
  reviews: Types.ObjectId[];
  variants: IProductVariant[];
  isActive: boolean;
}

const variantSchema = new Schema<IProductVariant>({
  color: { type: String },
  size: { type: String },
  sku: { type: String },
  stock: { type: Number, default: 0 },
  price: { type: Number, required: true },
});

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    images: [{ type: String }],
    stock: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
    variants: [variantSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.pre<IProduct>('save', function (next) {
  if (!this.slug) {
    this.slug = generateSlug(this.title);
  }
  next();
});

productSchema.index({ title: 'text', description: 'text' });

export const ProductModel = model<IProduct>('Product', productSchema);
