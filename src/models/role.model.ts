import mongoose, { Schema, Document } from 'mongoose';

export const ROLE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

// _id is a string: the slug. System roles use the user role enum value ('admin', 'superadmin').
export interface IRole extends Omit<Document, '_id'> {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  permissionIds: string[];
  isSystem: boolean;
  status: (typeof ROLE_STATUSES)[number];
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    permissionIds: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    status: { type: String, enum: ROLE_STATUSES, default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const RoleModel = mongoose.model<IRole>('Role', RoleSchema);
