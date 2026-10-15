import mongoose, { Schema, Document } from 'mongoose';

export interface IEnquiry extends Document {
  fullName: string;
  mobileNumber: string;
  email: string;
  companyOrganization?: string;
  state?: string;
  city?: string;
  projectType: string;
  projectSize?: string;
  budgetRange?: string;
  servicesRequired?: string[];
  timeline?: string;
  message: string;
  attachmentUrl?: string;
  preferredContact?: string;
  agreeToContact: boolean;
  status: 'pending' | 'contacted' | 'resolved' | 'cancelled' | 'closed' | 'new' | 'qualified';
  isRead: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    email: { type: String, required: true },
    companyOrganization: { type: String },
    state: { type: String },
    city: { type: String },
    projectType: { type: String, required: true },
    projectSize: { type: String },
    budgetRange: { type: String },
    servicesRequired: [{ type: String }],
    timeline: { type: String },
    message: { type: String, required: true },
    attachmentUrl: { type: String },
    preferredContact: { type: String },
    agreeToContact: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'resolved', 'cancelled', 'closed', 'new', 'qualified'],
      default: 'pending',
    },
    isRead: { type: Boolean, default: false },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const EnquiryModel = mongoose.model<IEnquiry>('Enquiry', EnquirySchema);