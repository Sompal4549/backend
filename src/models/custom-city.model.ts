import mongoose, { Schema, Document } from 'mongoose';

/** A city the admin added for a state (Add by Admin → Dropdowns → Cities). stateCode is "IN-DL" style. */
export interface ICustomCity extends Document {
  countryCode: string;
  stateCode: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomCitySchema = new Schema<ICustomCity>(
  {
    countryCode: { type: String, required: true, uppercase: true, trim: true },
    stateCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collation: { locale: 'en', strength: 2 } }
);

// Case-insensitive: "noida" and "Noida" are the same city
CustomCitySchema.index({ stateCode: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const CustomCityModel = mongoose.model<ICustomCity>('CustomCity', CustomCitySchema);
