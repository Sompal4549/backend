import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILead extends Document {
  leadImage?: string;
  firstName: string;
  lastName?: string;
  companyName?: string;
  designation?: string;
  email: string;
  officialEmail?: string;
  phone: string;
  phoneCode?: string;
  altPhone?: string;
  altPhoneCode?: string;
  landline?: string;
  website?: string;
  title?: string;
  typeOfBusiness?: string;
  industrySector?: string;
  marketType?: "Domestic" | "International";
  leadType?: "Individual" | "Corporate";
  leadSource?: string;
  leadStatus?: "New" | "Contacted" | "Qualified" | "Negotiation" | "Converted" | "Lost";
  priority?: "High" | "Medium" | "Low";
  assignedTo?: Types.ObjectId | null;
  ownerName?: string;
  ownerTeam?: string;
  eventAttribution?: string;
  leadDate?: string;
  followUpDate?: string;
  followUpTime?: string;
  followUpMethod?: "WhatsApp" | "Email" | "Phone" | "Meeting" | "Other" | "";
  followUpSource?: string;
  interestedProduct?: string;
  expectedBudget?: string;
  area?: string;
  budget?: string;
  expectedStart?: string;
  requirementBrief?: string;
  estimatedDealValue?: string;
  expectedClosingDate?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  leadNotes?: string;
  internalNotes?: string;
  leadCategory?: "hot" | "cold" | "";
  refreshToken?: string;
  orders?: Types.ObjectId[];
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

const leadSchema = new Schema<ILead>(
  {
    leadImage: { type: String, default: "" },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: "", trim: true },
    companyName: { type: String, default: "Individual", trim: true },
    designation: { type: String, default: "" },
    email: { type: String, required: true, lowercase: true, trim: true },
    officialEmail: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, required: true },
    phoneCode: { type: String, default: "+91" },
    altPhone: { type: String, default: "" },
    altPhoneCode: { type: String, default: "+91" },
    landline: { type: String, default: "" },
    website: { type: String, default: "" },
    title: { type: String, default: "Mr./Ms." },
    typeOfBusiness: { type: String, default: "Other" },
    industrySector: { type: String, default: "Wellness" },
    marketType: {
      type: String,
      enum: ["Domestic", "International"],
      default: "Domestic",
    },
    leadType: {
      type: String,
      enum: ["Individual", "Corporate"],
      default: "Individual",
    },
    leadSource: {
      type: String,
      enum: ["Instagram", "Facebook", "Website", "WhatsApp", "Google", "LinkedIn", "Referral", "Cold Call", "Event", "Meta Ads", "Excel Import", "Social Media", "Other"],
      default: "Website",
    },
    leadStatus: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Quotation Sent", "Negotiation", "Converted", "Lost"],
      default: "New",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "High",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
    ownerName: { type: String, default: "Simran Kaur" },
    ownerTeam: { type: String, default: "Sales" },
    eventAttribution: { type: String, default: "Website" },
    leadDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    followUpDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    followUpTime: { type: String, default: "" },
    followUpMethod: {
      type: String,
      enum: ["WhatsApp", "Email", "Phone", "Meeting", "Other", ""],
      default: "",
    },
    followUpSource: { type: String, default: "" },
    interestedProduct: { type: String, default: "" },
    expectedBudget: { type: String, default: "" },
    area: { type: String, default: "" },
    budget: { type: String, default: "" },
    expectedStart: { type: String, default: "" },
    requirementBrief: { type: String, default: "" },
    estimatedDealValue: { type: String, default: "" },
    expectedClosingDate: { type: String, default: "" },
    addressLine: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "India" },
    zipCode: { type: String, default: "" },
    leadNotes: { type: String, default: "" },
    internalNotes: { type: String, default: "" },
    leadCategory: {
      type: String,
      enum: ["hot", "cold", ""],
      default: "",
    },
    refreshToken: { type: String, select: false },
    orders: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  },
  { timestamps: true }
);

leadSchema.index({ firstName: "text", lastName: "text", companyName: "text", email: "text" });

export const LeadModel = mongoose.model<ILead>("Lead", leadSchema);
