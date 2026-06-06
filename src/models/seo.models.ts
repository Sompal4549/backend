// models/seo.model

import { Schema, model } from "mongoose";

const seoSchema = new Schema(
  {
    pageSlug: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    keywords: [String],
    canonicalUrl: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
  },
  {
    timestamps: true,
  }
);

export default model("Seo", seoSchema);