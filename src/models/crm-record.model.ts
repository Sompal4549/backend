import mongoose, { Document, Schema } from 'mongoose';

export interface ICrmRecord extends Document {
  key: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const crmRecordSchema = new Schema<ICrmRecord>(
  {
    key: { type: String, required: true, unique: true, index: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const CrmRecord =
  mongoose.models.CrmRecord || mongoose.model<ICrmRecord>('CrmRecord', crmRecordSchema, 'crm_records');

export default CrmRecord;
