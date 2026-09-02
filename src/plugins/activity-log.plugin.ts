import { Schema, Query, Document } from 'mongoose';
import mongoose from 'mongoose';
import { logCreate, logUpdate, logDelete } from '../services/activity-log.service';

const SKIP_MODELS = new Set(['ActivityLog']);

const getModelName = (model: unknown): string =>
  (model as { modelName?: string } | undefined)?.modelName || '';

const skip = (modelName: string): boolean => SKIP_MODELS.has(modelName);

const toPlain = (doc: unknown): Record<string, unknown> | undefined => {
  if (!doc) return undefined;
  const candidate = doc as { toObject?: () => unknown };
  if (typeof candidate.toObject === 'function') {
    return candidate.toObject() as Record<string, unknown>;
  }
  return candidate as Record<string, unknown>;
};

const pickTitle = (doc: Record<string, unknown> | undefined): string | undefined => {
  if (!doc) return undefined;
  const candidates = [
    'title',
    'name',
    'label',
    'key',
    'pageName',
    'subject',
    'heading',
    'fullName',
    'email',
    'phone',
    'platform',
  ];
  for (const key of candidates) {
    const value = doc[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return doc._id ? String(doc._id) : undefined;
};

const extractLeadId = (doc: Record<string, unknown> | undefined): string | undefined => {
  if (!doc) return undefined;
  const lead = doc.lead;
  if (!lead) return undefined;
  if (typeof lead === 'string') return lead;
  if (typeof lead === 'object' && lead !== null) {
    const leadObj = lead as Record<string, unknown>;
    if (leadObj._id) return String(leadObj._id);
    if (leadObj.$oid) return String(leadObj.$oid);
  }
  return undefined;
};

interface SaveDocument extends Document {
  __activityBefore?: Record<string, unknown>;
  __activityIsNew?: boolean;
}

interface LoggedQuery extends Query<unknown, unknown> {
  __activityBefore?: Record<string, unknown>;
}

const queryModelName = (query: Query<unknown, unknown>): string =>
  getModelName((query as unknown as { model?: { modelName?: string } }).model);

export const activityLogPlugin = (schema: Schema): void => {
  schema.pre<SaveDocument>('save', async function () {    if (skip(getModelName(this.constructor))) return;
    this.__activityIsNew = this.isNew;
    if (this.isNew) return;
    try {
      const Model = this.constructor as typeof import('mongoose').Model<unknown>;
      const before = await Model.findById(this._id);
      this.__activityBefore = toPlain(before);
    } catch {
      /* ignore fetch failures */
    }
  });

  schema.post<SaveDocument>('save', async function () {
    const modelName = getModelName(this.constructor);
    if (skip(modelName)) return;
    const plain = toPlain(this) || {};
    const title = pickTitle(plain);
    const entityId = this._id ? String(this._id) : undefined;
    const leadId = extractLeadId(plain);
    if (this.__activityIsNew) {
      await logCreate(modelName, entityId, title, plain, leadId);
    } else {
      await logUpdate(modelName, entityId, title, this.__activityBefore || {}, plain, leadId);
    }
  });

  schema.pre('findOneAndUpdate', async function () {
    const query = this as LoggedQuery;
    if (skip(queryModelName(query))) return;
    try {
      const before = await query.model.findOne(query.getFilter());
      if (before) {
        query.__activityBefore = toPlain(before);
      }
    } catch {
      /* ignore fetch failures */
    }
  });

  schema.post('findOneAndUpdate', async function (result: unknown) {
    const query = this as LoggedQuery;
    const modelName = queryModelName(query);
    if (skip(modelName)) return;
    const after = toPlain(result);
    if (!after?._id) return;
    const before = query.__activityBefore;
    if (!before) return;
    const leadId = extractLeadId(after) || extractLeadId(before);
    await logUpdate(modelName, String(after._id), pickTitle(after), before, after, leadId);
  });

  schema.post('findOneAndDelete', async function (result: unknown) {
    const query = this as LoggedQuery;
    const modelName = queryModelName(query);
    if (skip(modelName)) return;
    const deleted = toPlain(result);
    if (!deleted?._id) return;
    const leadId = extractLeadId(deleted);
    await logDelete(modelName, String(deleted._id), pickTitle(deleted), deleted, leadId);
  });

  schema.pre('deleteOne', async function () {
    const query = this as LoggedQuery;
    const modelName = queryModelName(query);
    if (skip(modelName)) return;
    try {
      const docs = await query.model.find(query.getFilter());
      for (const doc of docs) {
        const plain = toPlain(doc);
        if (!plain?._id) continue;
        const leadId = extractLeadId(plain);
        await logDelete(modelName, String(plain._id), pickTitle(plain), plain, leadId);
      }
    } catch {
      /* ignore fetch failures */
    }
  });

  schema.pre('deleteMany', async function () {
    const query = this as LoggedQuery;
    const modelName = queryModelName(query);
    if (skip(modelName)) return;
    try {
      const docs = await query.model.find(query.getFilter());
      if (!docs.length) return;
      const plain = toPlain(docs[0]) || {};
      const leadId = extractLeadId(plain);
      await logDelete(modelName, plain._id ? String(plain._id) : undefined, pickTitle(plain), {
        _count: docs.length,
        sample: plain,
      }, leadId);
    } catch {
      /* ignore fetch failures */
    }
  });
};

// Register globally so every model compiled after this module is imported gets the plugin
mongoose.plugin(activityLogPlugin);