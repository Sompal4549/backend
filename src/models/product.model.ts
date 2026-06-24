import { Schema, model, Document, Types } from 'mongoose';
import { generateSlug } from '../utils/generate-slug';

export interface IProduct extends Document {
  title: string;
  slug: string;
  code?: string;
  description: string;
  shortDescription?: string;
  price: number;
  discountPrice?: number;
  category: Types.ObjectId;
  subcategory?: string;
  material?: string;
  weight?: string;
  images: string[];
  stock: number;
  tags: string[];
  averageRating: number;
  reviews: Types.ObjectId[];
  isActive: boolean;
  isFeatured: boolean;
  overview?: {
    title?: string;
    description?: string;
    overviewList?: string[];
    specifications?: { title: string; specificationsList: { title: string; description: string }[] }[];
    keyFeatures?: { title: string; keyFeaturesList: string[] };
    dimensions?: { title: string; dimensionsList: { title: string; description: string }[] }[];
    materialAndCare?: { title: string; description: string };
    productSpecifications?: { highlight: string; title: string; image: string; specifications: { title: string; description: string }[] }[];
    whatisInclueded?: string[];
    items?: { image: string; title: string; description: string }[];
    smartDesignAppearance?: {
      highlight?: string;
      title?: string;
      woodFinish?: string[];
      sizeOptions?: { title: string; description: string }[];
    };
    faqs?: { question: string; description: string }[];
  };
}

const listItemSchema = new Schema({ title: String, description: String }, { _id: false });

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    code: { type: String, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategory: { type: String },
    material: { type: String },
    weight: { type: String },
    images: [{ type: String }],
    stock: { type: Number, default: 0 },
    tags: [{ type: String }],
    averageRating: { type: Number, default: 0 },
    reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    overview: {
      title: String,
      description: String,
      overviewList: [String],
      specifications: [new Schema({ title: String, specificationsList: [listItemSchema] }, { _id: false })],
      keyFeatures: new Schema({ title: String, keyFeaturesList: [listItemSchema] }, { _id: false }),
      dimensions: [new Schema({ title: String, dimensionsList: [listItemSchema] }, { _id: false })],
      materialAndCare: new Schema({ title: String, description: String }, { _id: false }),
      productSpecifications: [new Schema({
        highlight: String, title: String, image: String,
        specifications: [listItemSchema]
      }, { _id: false })],
      whatisInclueded: [String],
      items: [new Schema({ image: String, title: String, description: String }, { _id: false })],
      smartDesignAppearance: new Schema({
        highlight: String, title: String,
        woodFinish: [String],
        sizeOptions: [listItemSchema]
      }, { _id: false }),
      faqs: [new Schema({ question: String, description: String }, { _id: false })],
    },
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