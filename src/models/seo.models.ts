import { Schema, model } from "mongoose";

const seoSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    pageName: {
      type: String,
      required: true,
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      metaKeywords: String,
      canonical: String,
      ogJson: String,
      schema: String,
    },
    robots: {
      type: String,
      default: "index, follow",
    },
    faqs: [{ question: String, answer: String }],
    breadcrumbs: [{ label: String, href: String }],

    // Advanced SEO — yeh apna rakho as is
    advanced: {
      sitemap: {
        url: String,
        autoGenerate: { type: Boolean, default: true },
        excludePaths: String,
      },
      robotsTxt: { content: String },
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
  { timestamps: true }
);

export default model("Seo", seoSchema);