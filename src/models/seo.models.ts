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

    // Robots
    robots: {
      type: String,
      default: "index, follow",
    },

    // Advanced SEO
    advanced: {
      sitemap: {
        url: String,
        autoGenerate: { type: Boolean, default: true },
        excludePaths: String,
      },
      robotsTxt: {
        content: String,
      },
      searchConsole: {
        googleVerification: String,
        bingVerification: String,
      },
      analytics: {
        gaId: String,
        gtmId: String,
        fbPixelId: String,
        clarityId: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default model("Seo", seoSchema);