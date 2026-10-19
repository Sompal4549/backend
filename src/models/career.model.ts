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
  shortDescription?: string;
  coverImage?: string;
  aiCheckPoints?: string[];
  responsibilities?: string[];
  requirements?: string[];
  educationRequirements?: string;
  experienceMin?: number;
  experienceMax?: number;
  eligibilityThreshold?: number;
  partialMatchMin?: number;
  showMatchScoreToCandidate?: boolean;
  showMatchBreakdown?: boolean;
  featuredJob?: boolean;
  applicationClosingDate?: string;
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
  { timestamps: true, strict: false }
);

CareerSchema.pre('validate', function (next) {
  if (!this.get('type') && this.get('employmentType')) {
    this.set('type', this.get('employmentType'));
  }
  if (!this.get('experience')) {
    const min = this.get('experienceMin');
    const max = this.get('experienceMax');
    if (min && max) {
      this.set('experience', `${min} – ${max} Years`);
    } else if (min) {
      this.set('experience', `${min}+ Years`);
    } else {
      this.set('experience', 'Any');
    }
  }
  next();
});

export const CareerModel = mongoose.model<ICareer>('Career', CareerSchema, 'career_management');
