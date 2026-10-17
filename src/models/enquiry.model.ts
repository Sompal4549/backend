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
  pincode?: string;
  alternatePhone?: string;
  subject?: string;
  status: 'pending' | 'contacted' | 'resolved' | 'cancelled' | 'closed' | 'new' | 'qualified';
  isRead: boolean;
  notes?: string;
  /** Website form it came from: enquiry, contact, products */
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema: Schema = new Schema(
  {
    fullName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    // Required by the public form's validator; empty for chatbot callback leads (phone only)
    email: { type: String, default: '' },
    companyOrganization: { type: String },
    state: { type: String },
    city: { type: String },
    pincode: { type: String },
    alternatePhone: { type: String },
    subject: { type: String },
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
    source: { type: String, default: 'other' },
  },
  {
    timestamps: true,
  }
);

export const EnquiryModel = mongoose.model<IEnquiry>('Enquiry', EnquirySchema);