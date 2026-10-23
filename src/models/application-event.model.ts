import mongoose, { Schema, Document } from 'mongoose';

/** Activity-log row for one application: status changes, HR updates and admin notes
 *  shown on the "Applications & AI Response" board's Activity tab. */
export interface IApplicationEvent extends Document {
  applicationId: string;
  oldStatus?: string;
  newStatus: string;
  changedBy?: string;
  note?: string;
  createdAt: Date;
}

const ApplicationEventSchema = new Schema<IApplicationEvent>(
  {
    applicationId: { type: String, required: true, index: true },
    oldStatus: { type: String },
    newStatus: { type: String, required: true },
    changedBy: { type: String },
    note: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ApplicationEventModel = mongoose.model<IApplicationEvent>(
  'ApplicationEvent',
  ApplicationEventSchema,
  'application_events'
);
