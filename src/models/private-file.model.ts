import mongoose, { Schema, Document } from 'mongoose';

export type FileKind = 'photo' | 'document' | 'cv';

export interface IPrivateFile extends Document {
  fileId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  kind: FileKind;
  storagePath: string;
  uploadedByIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrivateFileSchema = new Schema<IPrivateFile>(
  {
    fileId: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    kind: { type: String, enum: ['photo', 'document', 'cv'], required: true },
    storagePath: { type: String, required: true },
    uploadedByIp: { type: String },
  },
  {
    timestamps: true,
  }
);

export const PrivateFileModel = mongoose.model<IPrivateFile>('PrivateFile', PrivateFileSchema, 'private_files');
