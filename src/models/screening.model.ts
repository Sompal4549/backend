import mongoose, { Schema, Document } from 'mongoose';

export type StepKey =
  | 'read_cv'
  | 'match_skills'
  | 'check_experience'
  | 'verify_education'
  | 'analyze_competencies'
  | 'calculate_score';

export type StepState = 'done' | 'active' | 'pending';

export type MatchLevel = 'eligible' | 'partial' | 'not_eligible';

export type BreakdownKey =
  | 'education'
  | 'experience'
  | 'technical_skills'
  | 'creative_thinking'
  | 'communication'
  | 'portfolio'
  | 'location';

export interface IBreakdownItem {
  key: BreakdownKey;
  label: string;
  sublabel: string;
  score: number;
}

export interface ICandidateProfile {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  currentLocation?: string;
  permanentAddress?: string;
  linkedin?: string;
  photoUrl?: string;
  education: Array<{
    qualification: string;
    institute: string;
    year: string;
    score: string;
    specialization: string;
  }>;
  experience: Array<{
    organization: string;
    designation: string;
    from: string;
    to: string;
    responsibilities: string;
  }>;
  skills: Array<{
    name: string;
    level: number;
  }>;
  certifications: string[];
}

export interface IScreeningResult {
  score: number;
  level: MatchLevel;
  thresholds: {
    eligible: number;
    partial: number;
  };
  breakdown: IBreakdownItem[];
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  profile: ICandidateProfile;
}

export interface IScreeningCv {
  fileName: string;
  size: number;
  uploadedAt: string;
  fileId?: string;
  storagePath?: string;
}

export interface IScreeningStep {
  key: StepKey;
  label: string;
  state: StepState;
}

export interface IScreening extends Document {
  screeningId: string;
  jobId: string;
  status: 'processing' | 'done' | 'failed';
  progress: number;
  steps: IScreeningStep[];
  cv: IScreeningCv;
  error?: string;
  result?: IScreeningResult;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ScreeningSchema = new Schema<IScreening>(
  {
    screeningId: { type: String, required: true, unique: true, index: true },
    jobId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['processing', 'done', 'failed'],
      default: 'processing',
      index: true,
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    steps: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        state: { type: String, enum: ['done', 'active', 'pending'], default: 'pending' },
      },
    ],
    cv: {
      fileName: { type: String, required: true },
      size: { type: Number, required: true },
      uploadedAt: { type: String, required: true },
      fileId: { type: String },
      storagePath: { type: String },
    },
    error: { type: String },
    result: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    ip: { type: String },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge screenings after 30 days
ScreeningSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ScreeningModel = mongoose.model<IScreening>('Screening', ScreeningSchema, 'career_screenings');
