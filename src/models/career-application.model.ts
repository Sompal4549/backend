import mongoose, { Schema, Document } from 'mongoose';
import { ICandidateProfile, IScreeningResult } from './screening.model';

export type ApplicationStatus =
  | 'received'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'rejected'
  | 'hired';

export interface IApplicationDetails {
  preferredLocations: string[];
  noticePeriod: string;
  expectedCtc: string;
  joiningPreference: string;
  howDidYouHear?: string;
  willingToRelocate?: boolean;
}

export interface IApplicationAdditional {
  whyJoin: string;
  extraSkills?: string;
  workedWith: string[];
}

export interface IApplicationReference {
  name: string;
  designation: string;
  organization: string;
  phone: string;
  email: string;
}

export interface IApplicationDocument {
  fileId: string;
  label: string;
  fileName?: string;
  size?: number;
}

export interface IApplicationConsents {
  accurate: boolean;
  verify: boolean;
  futureContact: boolean;
  privacy: boolean;
}

export interface IApplicationInterview {
  date?: string;
  time?: string;
  mode?: string;
  linkOrLocation?: string;
  instructions?: string;
}

export type HrStatus =
  | 'Not Forwarded'
  | 'Sent to HR'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview'
  | 'Selected'
  | 'On Hold'
  | 'Rejected';

export const HR_STATUSES: HrStatus[] = [
  'Not Forwarded',
  'Sent to HR',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Selected',
  'On Hold',
  'Rejected',
];

export interface IHrForwardInfo {
  recipients: string[];
  share: string[];
  note?: string;
  forwardedAt?: Date;
  forwardedBy?: string;
}

export interface IStatusHistoryItem {
  status: ApplicationStatus;
  changedAt: Date;
  changedBy?: string;
  note?: string;
}

export interface IInternalNoteItem {
  note: string;
  createdAt: Date;
  author?: string;
}

export interface ICareerApplication extends Document {
  applicationId: string; // "ENS-CAR-2026-00001"
  screeningId: string;
  jobId: string;
  jobTitle: string;
  profile: ICandidateProfile;
  details: IApplicationDetails;
  additional: IApplicationAdditional;
  references: IApplicationReference[];
  documents: IApplicationDocument[];
  consents: IApplicationConsents;
  screeningResult: IScreeningResult;
  status: ApplicationStatus;
  statusHistory: IStatusHistoryItem[];
  internalNotes: IInternalNoteItem[];
  interview?: IApplicationInterview;

  // HR workflow (admin "Applications & AI Response" board)
  hrStatus: HrStatus;
  hrUpdatedAt?: Date;
  hrUpdatedBy?: string;
  hrForward?: IHrForwardInfo;

  // Flattened legacy fields for backward compatibility
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  department: string;
  resume: string;
  experience: string;
  source: string;
  aiScore?: number;
  aiSummary?: string;
  linkedin?: string;
  noticePeriod?: string;
  expectedCTC?: string;
  willingToRelocate?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const CareerApplicationSchema = new Schema<ICareerApplication>(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    screeningId: { type: String, required: true, index: true },
    jobId: { type: String, required: true, index: true },
    jobTitle: { type: String, required: true },
    profile: { type: Schema.Types.Mixed, required: true },
    details: { type: Schema.Types.Mixed, required: true },
    additional: { type: Schema.Types.Mixed, required: true },
    references: { type: Schema.Types.Mixed, default: [] },
    documents: { type: Schema.Types.Mixed, default: [] },
    consents: { type: Schema.Types.Mixed, required: true },
    screeningResult: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['received', 'shortlisted', 'interview_scheduled', 'rejected', 'hired', 'pending', 'reviewed'],
      default: 'received',
      index: true,
    },
    statusHistory: {
      type: [
        {
          status: { type: String, required: true },
          changedAt: { type: Date, default: Date.now },
          changedBy: { type: String },
          note: { type: String },
        },
      ],
      default: [],
    },
    internalNotes: {
      type: [
        {
          note: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
          author: { type: String },
        },
      ],
      default: [],
    },
    interview: {
      date: String,
      time: String,
      mode: String,
      linkOrLocation: String,
      instructions: String,
    },

    hrStatus: {
      type: String,
      enum: HR_STATUSES,
      default: 'Not Forwarded',
      index: true,
    },
    hrUpdatedAt: { type: Date },
    hrUpdatedBy: { type: String },
    hrForward: { type: Schema.Types.Mixed },

    // Legacy fields
    fullName: { type: String, index: true },
    email: { type: String, index: true },
    phone: { type: String },
    currentLocation: { type: String },
    department: { type: String },
    resume: { type: String },
    experience: { type: String },
    source: { type: String, default: 'ai-cv' },
    aiScore: { type: Number },
    aiSummary: { type: String },
    linkedin: { type: String },
    noticePeriod: { type: String },
    expectedCTC: { type: String },
    willingToRelocate: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
    strict: false,
  }
);

// Compound index to quickly find duplicate applications within 30 days
CareerApplicationSchema.index({ jobId: 1, email: 1, createdAt: -1 });

export const CareerApplicationModel = mongoose.model<ICareerApplication>(
  'CareerApplication',
  CareerApplicationSchema,
  'applications'
);
