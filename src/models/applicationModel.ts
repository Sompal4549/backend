import mongoose, { Schema, Document } from "mongoose";

export interface IApplication extends Document {
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  department: string;
  resume: string;
  coverLetter?: string;
  experience:string;
  status: "pending" | "reviewed" | "shortlisted" | "rejected";
  notes?: string;
  /** "career-form" (general form) or "ai-cv" (job Apply flow with CV screening) */
  source: "career-form" | "ai-cv";
  aiScore?: number;
  jobTitle?: string;
  aiSummary?: string;
  linkedin?: string;
  currentCompany?: string;
  currentDesignation?: string;
  noticePeriod?: string;
  expectedCTC?: string;
  willingToRelocate?: string;
  employmentStatus?: string;
}

const applicationSchema = new Schema<IApplication>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
    },

    currentLocation: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      required: true,
    },

    resume: {
      type: String,
      required: true,
    },

    coverLetter: {
      type: String,
      default: "",
    },
experience: {
  type: String,
  required: true,
},
    status: {
      type: String,
      enum: [
        "pending",
        "reviewed",
        "shortlisted",
        "rejected",
      ],
      default: "pending",
    },
    // HR notes, written in the admin
    notes: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      enum: ["career-form", "ai-cv"],
      default: "career-form",
    },
    // Filled by the AI CV screening flow
    aiScore: { type: Number, min: 0, max: 100 },
    jobTitle: { type: String, default: "" },
    aiSummary: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    currentCompany: { type: String, default: "" },
    currentDesignation: { type: String, default: "" },
    noticePeriod: { type: String, default: "" },
    expectedCTC: { type: String, default: "" },
    willingToRelocate: { type: String, default: "" },
    employmentStatus: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IApplication>(
  "Application",
  applicationSchema
);