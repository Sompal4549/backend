import mongoose, { Schema, Document } from 'mongoose';

export interface ICareer extends Document {
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  applications: number;
  status: 'active' | 'closed';
}

const CareerSchema: Schema = new Schema({
  title: { type: String, required: true },
  department: { type: String, required: true },
  location: { type: String, required: true },
  type: { type: String, required: true },
  experience: { type: String, required: true },
  applications: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'closed'], default: 'active' }
}, { timestamps: true });

export const CareerModel = mongoose.model<ICareer>('Career', CareerSchema, 'career_management');