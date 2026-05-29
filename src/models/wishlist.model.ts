import { Schema, model, Document, Types } from 'mongoose';

export interface IWishlist extends Document {
  user: Types.ObjectId;
  products: Types.ObjectId[];
}

const wishlistSchema = new Schema<IWishlist>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true }
);

export const WishlistModel = model<IWishlist>('Wishlist', wishlistSchema);
