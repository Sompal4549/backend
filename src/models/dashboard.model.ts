import { Schema, model, Document } from 'mongoose';

export interface IDashboard extends Document {
  module: string;
  metrics: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

const dashboardSchema = new Schema<IDashboard>(
  {
    module: { type: String, required: true },
    metrics: { type: Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
  },
  { timestamps: true }
);

export const DashboardModel = model<IDashboard>('Dashboard', dashboardSchema);