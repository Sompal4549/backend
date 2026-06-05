import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  title: string;
  category: string;
  location: string;
  client: string;
  projectYear: number;
  isFeatured: boolean;
  status: 'ongoing' | 'completed';
  image?: string;
}

const ProjectSchema: Schema = new Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  client: { type: String, required: true },
  projectYear: { type: Number, required: true },
  isFeatured: { type: Boolean, default: false },
  status: { type: String, enum: ['ongoing', 'completed'], default: 'completed' },
  image: { type: String }
}, { timestamps: true });

export const ProjectModel = mongoose.model<IProject>('Project', ProjectSchema, 'project_management');