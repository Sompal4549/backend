import { Schema, model, Document, Types } from 'mongoose';

export interface IAddress extends Document {
  user: Types.ObjectId;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const addressSchema = new Schema<IAddress>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { timestamps: true }
);

export const AddressModel = model<IAddress>('Address', addressSchema);
