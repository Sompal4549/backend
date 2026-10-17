import { Schema, model, Document, Types } from 'mongoose';
import { generateSlug } from '../utils/generate-slug';
import { cityPageSchema, ICityPage } from './city-page.schema';

export interface IProduct extends Document {
  title: string;
  slug: string;
  code?: string;
  hsnCode?: string;
  description: string;
  shortDescription?: string;
  price: number;
  discountPrice?: number;
  gstRate?: number;
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
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  orderBy: number;
  overview?: {
    // title?: string;
    // description?: string;
    // overviewList?: string[];
    // specifications?: {
    //   title?: string;
    //   specificationsList?: { title: string; description: string }[];
    // };
    // seeItInRealSpaces:{title:string; images:{image:string; imageAlt:string}[]};
    productPricingFeatures:{title:string; image:string}[];
    emiOptions:boolean;
    customSize:boolean;
    // keyFeatures?: {
    //   title?: string;
    //   keyFeaturesList?: string[];
    // };
    idealFor?: string;
    // dimensions?: { title: string; dimensionsList: { title: string; description: string }[] };
    // materialAndCare?: { title: string; description: string };
    productSpecifications?: { highlight: string; title: string; image: string; specifications: { title: string; description: string }[] }[];
    whatisInclueded?: string[];
    // items?: { image: string; title: string; description: string }[];
    smartDesignAppearance?: {
      highlight?: string;
      title?: string;
      woodFinish?: {image:string; title:string}[];
      sizeOptions?: { title: string; description: string }[];
    };
    // faqs?: { question: string; description: string }[];
  };
  cities?: ICityPage[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    canonical?: string;
    ogImage?: string;
  };
}

const listItemSchema = new Schema({ title: String, description: String }, { _id: false });

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    code: { type: String, trim: true },
    hsnCode: { type: String, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    gstRate: { type: Number, default: 5 },
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
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    orderBy: { type: Number, default: 0 },
    overview: {
      // title: String,
      // description: String,
      // overviewList: [String],

      // specifications: new Schema(
      //   {
      //     title: String,
      //     specificationsList: [listItemSchema],
      //   },
      //   { _id: false }
      // ),

      // seeItInRealSpaces: new Schema(
      //   {
      //     title: String,
      //     images: [
      //       new Schema(
      //         {
      //           image: String,
      //           imageAlt: String,
      //         },
      //         { _id: false }
      //       ),
      //     ],
      //   },
      //   { _id: false }
      // ),
 
      productPricingFeatures: [
        new Schema(
          {
            title: String,
            image: String,
          },
          { _id: false }
        ),
      ],

      emiOptions: {
        type: Boolean,
        default: false,
      },

      customSize: {
        type: Boolean,
        default: false,
      },

      // keyFeatures: new Schema(
      //   {
      //     title: String,
      //     keyFeaturesList: [String],
      //   },
      //   { _id: false }
      // ),

      idealFor: String,

      // dimensions: new Schema(
      //   {
      //     title: { type: String, default: '' },
      //     dimensionsList: {
      //       type: [listItemSchema],
      //       default: [{ title: '', description: '' }],
      //     },
      //   },
      //   { _id: false }
      // ),

      // materialAndCare: new Schema(
      //   {
      //     title: String,
      //     description: String,
      //   },
      //   { _id: false }
      // ),

      productSpecifications: [
        new Schema(
          {
            highlight: String,
            title: String,
            image: String,
            specifications: [listItemSchema],
          },
          { _id: false }
        ),
      ],

      whatisInclueded: [String],

      // items: [
      //   new Schema(
      //     {
      //       image: String,
      //       title: String,
      //       description: String,
      //     },
      //     { _id: false }
      //   ),
      // ],

      smartDesignAppearance: new Schema(
        {
          highlight: String,
          title: String,
          woodFinish: [
            new Schema(
              {
                image: String,
                title: String,
              },
              { _id: false }
            ),
          ],
          sizeOptions: [listItemSchema],
        },
        { _id: false }
      ),

      // faqs: [
      //   new Schema(
      //     {
      //       question: String,
      //       description: String,
      //     },
      //     { _id: false }
      //   ),
      // ],
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      metaKeywords: String,
      canonical: String,
      ogImage: String,
    },
    cities: { type: [cityPageSchema], default: [] },
  },
  { timestamps: true }
);

// Before validation, so a product saved without a slug gets one instead of failing "slug is required".
// Titles can hold markup such as <br> for the storefront hero; the slug uses the plain words.
productSchema.pre<IProduct>('validate', function (next) {
  if (!this.slug && this.title) {
    this.slug = generateSlug(this.title.replace(/<[^>]+>/g, ' '));
  }
  next();
});

productSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const ProductModel = model<IProduct>('Product', productSchema);