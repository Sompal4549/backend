import { Schema, model, Document } from "mongoose";

export interface ISocialClick extends Document {
  platform: string;
  ip: string;
  userAgent?: string;
  country?: string;
  createdAt: Date;
}

const socialClickSchema = new Schema<ISocialClick>(
  {
    platform: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    ip: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    country: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const SocialClick = model<ISocialClick>(
  "SocialClick",
  socialClickSchema
);

export interface ISocialLink extends Document {
  platform: string;
  url: string;
  icon?: string;      // uploaded image URL
  isActive: boolean;
  order: number;
}
 
const socialLinkSchema = new Schema<ISocialLink>(
  {
    platform: { type: String, required: true, unique: true, trim: true, lowercase: true },
    url:      { type: String, required: true, trim: true },
    icon:     { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order:    { type: Number, default: 0 },
  },
  { timestamps: true }
);
 
export const SocialLink = model<ISocialLink>("SocialLink", socialLinkSchema);
 