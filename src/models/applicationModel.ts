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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IApplication>(
  "Application",
  applicationSchema
);