import { Schema, model, Types } from "mongoose";

// One page result inside an audit run
const seoAuditPageSchema = new Schema(
  {
    url: String,
    path: String,
    httpStatus: { type: Number, default: null },
    finalUrl: String,
    redirected: Boolean,
    responseTimeMs: { type: Number, default: null },
    contentType: String,
    title: String,
    titleLength: Number,
    metaDescription: String,
    metaDescriptionLength: Number,
    metaRobots: String,
    canonical: String,
    h1: [String],
    h2Count: Number,
    wordCount: Number,
    imageCount: Number,
    imagesMissingAlt: Number,
    lang: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    hasJsonLd: Boolean,
    error: String,
    score: Number,
    issues: [{ ruleId: String, severity: String, title: String, detail: String, _id: false }],
  },
  { _id: false }
);

const seoAuditSchema = new Schema(
  {
    target: { type: String, enum: ["site", "competitor"], default: "site", index: true },
    competitor: { type: Types.ObjectId, ref: "SeoCompetitor", default: null, index: true },
    siteUrl: { type: String, required: true },
    status: { type: String, enum: ["running", "completed", "failed"], default: "running", index: true },
    trigger: { type: String, default: "manual" },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
    robotsFound: { type: Boolean, default: false },
    sitemapFound: { type: Boolean, default: false },
    sitemapUrlCount: { type: Number, default: 0 },
    score: { type: Number, default: null },
    // Pages fetched so far / pages discovered, updated while the run is in progress
    progress: {
      done: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    stats: {
      pages: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      warning: { type: Number, default: 0 },
      notice: { type: Number, default: 0 },
    },
    pages: { type: [seoAuditPageSchema], default: [] },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

const seoCompetitorSchema = new Schema(
  {
    url: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    lastCrawlAt: { type: Date, default: null },
    lastScore: { type: Number, default: null },
  },
  { timestamps: true }
);

const seoAlertSchema = new Schema(
  {
    type: { type: String, required: true },
    severity: { type: String, enum: ["critical", "warning", "notice"], default: "warning" },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    url: { type: String, default: null },
    audit: { type: Types.ObjectId, ref: "SeoAudit", default: null },
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const SeoAudit = model("SeoAudit", seoAuditSchema);
export const SeoCompetitor = model("SeoCompetitor", seoCompetitorSchema);
export const SeoAlert = model("SeoAlert", seoAlertSchema);
