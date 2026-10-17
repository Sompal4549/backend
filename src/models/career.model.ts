import mongoose, { Schema, Document } from 'mongoose';

/** Admin job status (Job Postings page); the storefront only lists OPEN jobs */
export type JobStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

export interface ICareer extends Document {
  title: string;
  department: string;
  location: string;
  /** Employment type shown on the website, e.g. "Full Time" (= employmentType) */
  type: string;
  /** Experience shown on the website, e.g. "3 – 6 Years" (from experienceMin / experienceMax) */
  experience: string;
  applications: number;
  /** Website visibility: active = OPEN in the admin */
  status: 'active' | 'closed';
  slug?: string;
  jobStatus?: JobStatus;
  [key: string]: unknown;
}

const CareerSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    department: { type: String, required: true },
    location: { type: String, required: true },
    type: { type: String, required: true },
    experience: { type: String, required: true },
    applications: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    slug: { type: String, index: true },
    jobStatus: { type: String, enum: ['DRAFT', 'OPEN', 'CLOSED'] },
  },
  // The admin's job form has many optional fields (description, skills, CTC, screening settings…);
  // they are stored as sent, see careers-admin.controller for the allowed keys
  { timestamps: true, strict: false }
);

export const CareerModel = mongoose.model<ICareer>('Career', CareerSchema, 'career_management');
