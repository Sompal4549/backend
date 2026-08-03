import { Schema, model, Types } from 'mongoose';

export type ActivityAction = 'create' | 'update' | 'delete';

export interface IActivityLog {
  action: ActivityAction;
  entity: string;
  entityId?: string;
  title?: string;
  userId?: Types.ObjectId;
  userName?: string;
  userRole?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  snapshotBefore?: Record<string, unknown>;
  snapshotAfter?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    action: { type: String, enum: ['create', 'update', 'delete'], required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String },
    title: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    userRole: { type: String },
    changes: { type: Schema.Types.Mixed },
    snapshotBefore: { type: Schema.Types.Mixed },
    snapshotAfter: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

export const ActivityLogModel = model<IActivityLog>('ActivityLog', activityLogSchema);