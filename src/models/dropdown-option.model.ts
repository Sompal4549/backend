import mongoose, { Schema, Document } from 'mongoose';

/**
 * One option of an admin-managed website dropdown (Add by Admin → Dropdown Manager).
 * Options are grouped by `list` (a key from DROPDOWN_LISTS in dropdowns.controller.ts).
 */
export interface IDropdownOption extends Document {
  list: string;
  label: string;
  value: string;
  parentValue: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DropdownOptionSchema = new Schema<IDropdownOption>(
  {
    list: { type: String, required: true, trim: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    value: { type: String, required: true, trim: true, maxlength: 200 },
    parentValue: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// A value may appear only once per list (per parent value)
DropdownOptionSchema.index({ list: 1, parentValue: 1, value: 1 }, { unique: true });
DropdownOptionSchema.index({ list: 1, isActive: 1, order: 1 });

export const DropdownOptionModel = mongoose.model<IDropdownOption>('DropdownOption', DropdownOptionSchema);

/**
 * Per-list bookkeeping: who changed the list last (shown as "Updated By"), and when the
 * built-in default options were copied into the database (so they are copied only once,
 * and an admin who deletes them all does not get them back).
 */
export interface IDropdownListMeta extends Document {
  list: string;
  updatedBy?: string;
  updatedAt?: Date;
  defaultsSeededAt?: Date;
}

const DropdownListMetaSchema = new Schema<IDropdownListMeta>({
  list: { type: String, required: true, unique: true, trim: true },
  updatedBy: { type: String, default: '' },
  updatedAt: { type: Date },
  defaultsSeededAt: { type: Date },
});

export const DropdownListMetaModel = mongoose.model<IDropdownListMeta>('DropdownListMeta', DropdownListMetaSchema);
