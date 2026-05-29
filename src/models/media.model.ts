import { Schema, model, Document, Types } from 'mongoose';

export interface IMedia extends Document {
  filename: string;
  url: string;
  mimetype: string;
  size: number;
  uploadedBy: Types.ObjectId;
}

const mediaSchema = new Schema<IMedia>(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const MediaModel = model<IMedia>('Media', mediaSchema);
