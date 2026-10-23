import { Request, Response } from 'express';
import { DropdownOptionModel, DropdownListMetaModel } from '../models/dropdown-option.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { AuthRequest } from '../middlewares/auth.middleware';
import { isObjectIdString } from '../utils/object-id';

/*
 * Admin-managed website dropdowns (ensis-admin lib/dropdownsApi.ts).
 * Every list the admin can manage is defined here with its built-in options. The first
 * time a list is read, its built-in options are copied into the database; from then on
 * the database is the source of truth.
 */

interface DropdownListDefinition {
  name: string;
  group: string;
  usedIn: string[];
  defaults: string[];
}

export const DROPDOWN_LISTS: Record<string, DropdownListDefinition> = {
  gender: { name: 'Gender', group: 'Shared', usedIn: ['Contact', 'User Profile'], defaults: ['Male', 'Female', 'Other'] },
  'yes-no': { name: 'Yes / No', group: 'Shared', usedIn: ['Forms', 'Enquiries'], defaults: ['Yes', 'No'] },
  'project-type': {
    name: 'Project Type',
    group: 'Enquiries',
    usedIn: ['Enquiry Form'],
    defaults: ['New Clinic Setup', 'Resort / Spa Setup', 'Hospital Upgrade', 'Equipment Purchase', 'Custom Design'],
  },
  'enquiry-source': {
    name: 'Enquiry Source',
    group: 'Enquiries',
    usedIn: ['Enquiry Management'],
    defaults: ['Website Form', 'Chatbot', 'Direct Call', 'WhatsApp', 'Referral'],
  },
  'careers-current-location': {
    name: 'Current Location',
    group: 'Careers',
    usedIn: ['Careers Application Form'],
    defaults: ['Delhi, NCR', 'Noida', 'Gurugram', 'Ghaziabad', 'Faridabad', 'Other'],
  },
  // Stall Type and Open Sides choices for the Events & Stalls manager
  'exhibitor-stall-type': {
    name: 'Stall Type',
    group: 'Book a Stand',
    usedIn: ['Stall & rate setup'],
    defaults: ['Shell Scheme', 'Bare Space'],
  },
  'stall-pl-scheme': {
    name: 'Stall Open Sides (PL Scheme)',
    group: 'Book a Stand',
    usedIn: ['Stall setup'],
    defaults: ['One Side Open', 'Two Sides Open', 'Three Sides Open', 'Four Sides Open'],
  },
};

const LIST_KEYS = Object.keys(DROPDOWN_LISTS);
const isDropdownList = (key: unknown): key is string =>
  typeof key === 'string' && Object.prototype.hasOwnProperty.call(DROPDOWN_LISTS, key);

const listParam = (value: unknown): string => {
  if (!isDropdownList(value)) throw new AppError(400, `Unknown dropdown list "${String(value)}"`);
  return value;
};

const optionId = (value: unknown): string => {
  if (!isObjectIdString(value)) throw new AppError(400, 'Invalid option id');
  return String(value);
};

const text = (value: unknown, field: string, max = 200): string => {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, `${field} is required`);
  if (value.trim().length > max) throw new AppError(400, `${field} must be ${max} characters or fewer`);
  return value.trim();
};

const rethrowDuplicate = (error: any): never => {
  if (error?.code === 11000) throw new AppError(409, 'This value already exists in the list');
  throw error;
};

// Lists whose defaults are known to be in the database (saves a lookup per request)
const seededLists = new Set<string>();

/** Copies a list's built-in options into the database once. */
const ensureDefaults = async (lists: string[]) => {
  for (const list of lists) {
    if (seededLists.has(list)) continue;
    await DropdownListMetaModel.updateOne({ list }, { $setOnInsert: { list } }, { upsert: true }).catch((error: any) => {
      if (error?.code !== 11000) throw error; // a parallel request created it first
    });
    // Only the request that sets defaultsSeededAt copies the defaults
    const claim = await DropdownListMetaModel.updateOne(
      { list, defaultsSeededAt: { $exists: false } },
      { $set: { defaultsSeededAt: new Date() } }
    );
    if (claim.modifiedCount === 1) {
      const docs = DROPDOWN_LISTS[list].defaults.map((label, order) => ({ list, label, value: label, parentValue: '', order }));
      await DropdownOptionModel.insertMany(docs, { ordered: false }).catch((error: any) => {
        if (error?.code !== 11000) throw error;
      });
    }
    seededLists.add(list);
  }
};

/** Records the signed-in admin as the last one to change a list. */
const touchList = async (req: AuthRequest, list: string) => {
  const user = req.user as { name?: string; email?: string } | undefined;
  await DropdownListMetaModel.updateOne(
    { list },
    { $set: { updatedBy: user?.name || user?.email || 'Admin', updatedAt: new Date() } },
    { upsert: true }
  );
};

const PUBLIC_FIELDS = 'label value parentValue -_id';

/* ------------------------------ Public ------------------------------ */

// GET /dropdowns?lists=gender,yes-no → { gender: [...], 'yes-no': [...] } (all lists when omitted)
export const getDropdowns = asyncHandler(async (req: Request, res: Response) => {
  const requested =
    typeof req.query.lists === 'string' && req.query.lists.trim()
      ? req.query.lists.split(',').map((key) => key.trim()).filter(Boolean)
      : LIST_KEYS;
  const known = requested.filter(isDropdownList);
  await ensureDefaults(known);

  const options = await DropdownOptionModel.find({ list: { $in: known }, isActive: true })
    .sort({ order: 1, createdAt: 1 })
    .select(`list ${PUBLIC_FIELDS}`)
    .lean();

  // Unknown keys get an empty list so the website falls back to its own options
  const grouped: Record<string, unknown[]> = Object.fromEntries(requested.map((key) => [key, []]));
  for (const { list, ...option } of options as any[]) grouped[list].push(option);
  successResponse(res, grouped, 'Dropdowns fetched successfully');
});

// GET /dropdowns/:list?parent=<value>
export const getDropdown = asyncHandler(async (req: Request, res: Response) => {
  const list = req.params.list;
  if (!isDropdownList(list)) {
    successResponse(res, [], 'Dropdown fetched successfully');
    return;
  }
  await ensureDefaults([list]);
  const filter: Record<string, unknown> = { list, isActive: true };
  if (typeof req.query.parent === 'string') filter.parentValue = req.query.parent;
  const options = await DropdownOptionModel.find(filter).sort({ order: 1, createdAt: 1 }).select(PUBLIC_FIELDS).lean();
  successResponse(res, options, 'Dropdown fetched successfully');
});

/* ------------------------------ Admin ------------------------------ */

// GET /dropdowns/admin/lists
export const getAdminLists = asyncHandler(async (_req: Request, res: Response) => {
  await ensureDefaults(LIST_KEYS);
  const [counts, metas] = await Promise.all([
    DropdownOptionModel.aggregate([
      { $group: { _id: '$list', total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } },
    ]),
    DropdownListMetaModel.find().select('list updatedBy updatedAt -_id').lean(),
  ]);
  const byList = Object.fromEntries(counts.map((c: any) => [c._id, c]));
  const metaByList = Object.fromEntries(metas.map((m: any) => [m.list, m]));

  const lists = Object.entries(DROPDOWN_LISTS).map(([key, { name, group, usedIn }]) => ({
    key,
    name,
    group,
    usedIn,
    total: byList[key]?.total ?? 0,
    active: byList[key]?.active ?? 0,
    updatedBy: metaByList[key]?.updatedBy || null,
    updatedAt: metaByList[key]?.updatedAt ?? null,
  }));
  successResponse(res, lists, 'Dropdown lists retrieved');
});

// GET /dropdowns/admin/options?list=<key> → all options, inactive included
export const getAdminOptions = asyncHandler(async (req: Request, res: Response) => {
  const list = listParam(req.query.list);
  await ensureDefaults([list]);
  const options = await DropdownOptionModel.find({ list }).sort({ parentValue: 1, order: 1, createdAt: 1 }).lean();
  successResponse(res, options, 'Dropdown options retrieved');
});

// POST /dropdowns/admin/options { list, label, value?, parentValue?, isActive? }
export const createOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body ?? {};
  const list = listParam(body.list);
  await ensureDefaults([list]);
  const label = text(body.label, 'Label');
  const value = body.value === undefined || body.value === '' ? label : text(body.value, 'Value');
  const parentValue = typeof body.parentValue === 'string' ? body.parentValue.trim() : '';

  let order = Number(body.order);
  if (body.order === undefined || !Number.isFinite(order)) {
    const last = await DropdownOptionModel.findOne({ list, parentValue }).sort({ order: -1 }).select('order').lean();
    order = (last?.order ?? -1) + 1;
  }

  const option = await DropdownOptionModel.create({
    list,
    label,
    value,
    parentValue,
    order,
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  }).catch(rethrowDuplicate);
  await touchList(req, list);
  successResponse(res, option, 'Option created', 201);
});

// PATCH /dropdowns/admin/options/:id
export const updateOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const option = await DropdownOptionModel.findById(optionId(req.params.id));
  if (!option) throw new AppError(404, 'Option not found');

  const body = req.body ?? {};
  if (body.list !== undefined && body.list !== option.list) {
    throw new AppError(400, 'An option cannot be moved to another list');
  }
  if (body.label !== undefined) option.label = text(body.label, 'Label');
  if (body.value !== undefined) option.value = text(body.value, 'Value');
  if (body.parentValue !== undefined) option.parentValue = typeof body.parentValue === 'string' ? body.parentValue.trim() : '';
  if (body.order !== undefined) {
    if (!Number.isFinite(Number(body.order))) throw new AppError(400, 'Order must be a number');
    option.order = Number(body.order);
  }
  if (body.isActive !== undefined) option.isActive = Boolean(body.isActive);

  await option.save().catch(rethrowDuplicate);
  await touchList(req, option.list);
  successResponse(res, option, 'Option updated');
});

// DELETE /dropdowns/admin/options/:id
export const deleteOption = asyncHandler(async (req: AuthRequest, res: Response) => {
  const option = await DropdownOptionModel.findByIdAndDelete(optionId(req.params.id));
  if (!option) throw new AppError(404, 'Option not found');
  await touchList(req, option.list);
  successResponse(res, null, 'Option deleted');
});

// PUT /dropdowns/admin/lists/:list/order { ids: [...] } → first id gets order 0
export const reorderOptions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const list = listParam(req.params.list);
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || !ids.length || !ids.every(isObjectIdString)) {
    throw new AppError(400, 'ids must be a non-empty array of option ids');
  }
  const found = await DropdownOptionModel.countDocuments({ _id: { $in: ids }, list });
  if (found !== new Set(ids.map(String)).size) throw new AppError(400, 'Every id must belong to this list');

  await DropdownOptionModel.bulkWrite(
    ids.map((id: string, index: number) => ({ updateOne: { filter: { _id: id, list }, update: { $set: { order: index } } } }))
  );
  await touchList(req, list);
  const options = await DropdownOptionModel.find({ list }).sort({ parentValue: 1, order: 1 }).lean();
  successResponse(res, options, 'Order saved');
});
