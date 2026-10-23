import { Request, Response } from 'express';
import { ExpoEventModel, IPaymentPlan, StallModel, StallRateModel, STALL_STATUSES, STALL_CURRENCIES } from '../models/expo.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { isObjectIdString } from '../utils/object-id';

/*
 * Admin CRUD for the Events & Stalls manager (ensis-admin lib/expoApi.ts). Admin-only;
 * Stall Type / Open Sides are free text here (the admin offers the "exhibitor-stall-type"
 * and "stall-pl-scheme" dropdown lists as choices).
 */

const idParam = (value: unknown, what: string): string => {
  if (!isObjectIdString(value)) throw new AppError(400, `Invalid ${what} id`);
  return String(value);
};

const text = (value: unknown, field: string, { required = true, max = 150 } = {}): string => {
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v && required) throw new AppError(400, `${field} is required`);
  if (v.length > max) throw new AppError(400, `${field} must be ${max} characters or fewer`);
  return v;
};

const number = (value: unknown, field: string, { min = 0, max = Infinity } = {}): number => {
  const n = Number(value);
  if (value === '' || value === null || value === undefined || !Number.isFinite(n)) {
    throw new AppError(400, `${field} must be a number`);
  }
  if (n < min || n > max) throw new AppError(400, `${field} must be between ${min} and ${max === Infinity ? '∞' : max}`);
  return n;
};

const date = (value: unknown, field: string): Date => {
  const d = new Date(String(value));
  if (!value || Number.isNaN(d.getTime())) throw new AppError(400, `${field} must be a valid date`);
  return d;
};

const existingEvent = async (id: unknown) => {
  const event = await ExpoEventModel.findById(idParam(id, 'event'));
  if (!event) throw new AppError(404, 'Event not found');
  return event;
};

const rethrowDuplicate = (message: string) => (error: any): never => {
  if (error?.code === 11000) throw new AppError(409, message);
  throw error;
};

const paymentPlans = (value: unknown): IPaymentPlan[] => {
  if (!Array.isArray(value) || !value.length) throw new AppError(400, 'At least one payment plan is required');
  const plans = value.map((p: any, i) => ({
    id: text(p?.id, `Payment plan ${i + 1} id`, { max: 40 }),
    label: text(p?.label, `Payment plan ${i + 1} label`, { max: 60 }),
    percentage: number(p?.percentage, `Payment plan ${i + 1} percentage`, { min: 1, max: 100 }),
  }));
  if (new Set(plans.map((p) => p.id)).size !== plans.length) throw new AppError(400, 'Payment plan ids must be unique');
  return plans;
};

/** Whitelisted event fields; `partial` allows leaving fields out (PATCH). */
const eventFields = (body: any, partial: boolean) => {
  const out: Record<string, unknown> = {};
  if (!partial || body.name !== undefined) out.name = text(body.name, 'Event name');
  if (!partial || body.startDate !== undefined) out.startDate = date(body.startDate, 'Start date');
  if (!partial || body.endDate !== undefined) out.endDate = date(body.endDate, 'End date');
  if (body.venue !== undefined) out.venue = text(body.venue, 'Venue', { required: false, max: 200 });
  if (body.city !== undefined) out.city = text(body.city, 'City', { required: false, max: 80 });
  if (body.isActive !== undefined) out.isActive = Boolean(body.isActive);
  if (body.paymentPlans !== undefined) out.paymentPlans = paymentPlans(body.paymentPlans);
  return out;
};

/** Whitelisted stall fields; `partial` allows leaving fields out (PATCH). */
const stallFields = (body: any, partial: boolean) => {
  const out: Record<string, unknown> = {};
  if (!partial || body.stallNumber !== undefined) out.stallNumber = text(body.stallNumber, 'Stall number', { max: 30 });
  if (body.hall !== undefined) out.hall = text(body.hall, 'Hall', { required: false, max: 60 });
  if (!partial || body.stallType !== undefined) out.stallType = text(body.stallType, 'Stall type', { max: 100 });
  if (!partial || body.length !== undefined) out.length = number(body.length, 'Length (m)', { min: 0.5, max: 500 });
  if (!partial || body.width !== undefined) out.width = number(body.width, 'Width (m)', { min: 0.5, max: 500 });
  if (body.plScheme !== undefined) out.plScheme = text(body.plScheme, 'Open sides', { max: 100 });
  if (body.incrementPercentage !== undefined) out.incrementPercentage = number(body.incrementPercentage, 'Increment %', { max: 100 });
  if (body.discountPercentage !== undefined) out.discountPercentage = number(body.discountPercentage, 'Discount %', { max: 100 });
  if (body.status !== undefined) {
    if (!STALL_STATUSES.includes(body.status)) throw new AppError(400, `Status must be one of: ${STALL_STATUSES.join(', ')}`);
    out.status = body.status;
  }
  if (body.notes !== undefined) out.notes = text(body.notes, 'Notes', { required: false, max: 500 });
  return out;
};

const area = (length: number, width: number) => Math.round(length * width * 100) / 100;

/* ------------------------------ events ------------------------------ */

// GET /events/admin → events with stall counts per status
export const listEvents = asyncHandler(async (_req: Request, res: Response) => {
  const [events, stallCounts] = await Promise.all([
    ExpoEventModel.find().sort({ startDate: -1 }).lean(),
    StallModel.aggregate([{ $group: { _id: { event: '$event', status: '$status' }, count: { $sum: 1 } } }]),
  ]);
  const counts: Record<string, Record<string, number>> = {};
  for (const c of stallCounts) {
    const key = String(c._id.event);
    counts[key] ??= {};
    counts[key][c._id.status] = c.count;
  }
  successResponse(res, events.map((e) => ({ ...e, stallCounts: counts[String(e._id)] || {} })), 'Events retrieved');
});

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const fields = eventFields(req.body ?? {}, false);
  if ((fields.endDate as Date) < (fields.startDate as Date)) throw new AppError(400, 'End date cannot be before start date');
  const event = await ExpoEventModel.create(fields);
  successResponse(res, event, 'Event created', 201);
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await existingEvent(req.params.id);
  event.set(eventFields(req.body ?? {}, true));
  if (event.endDate < event.startDate) throw new AppError(400, 'End date cannot be before start date');
  await event.save();
  successResponse(res, event, 'Event updated');
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await existingEvent(req.params.id);
  const stalls = await StallModel.countDocuments({ event: event._id });
  if (stalls) throw new AppError(409, `This event has ${stalls} stall(s). Delete them first, or mark the event inactive.`);
  await StallRateModel.deleteMany({ event: event._id });
  await event.deleteOne();
  successResponse(res, null, 'Event deleted');
});

/* ------------------------------ stalls ------------------------------ */

// GET /stalls/admin?eventId=&status=
export const listStalls = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = { event: idParam(req.query.eventId, 'event') };
  if (req.query.status !== undefined) {
    if (!STALL_STATUSES.includes(req.query.status as any)) throw new AppError(400, 'Invalid status filter');
    filter.status = req.query.status;
  }
  const stalls = await StallModel.find(filter).sort({ hall: 1, stallNumber: 1 }).lean();
  successResponse(res, stalls, 'Stalls retrieved');
});

export const createStall = asyncHandler(async (req: Request, res: Response) => {
  const event = await existingEvent(req.body?.eventId);
  const fields = stallFields(req.body ?? {}, false);
  const stall = await StallModel.create({
    ...fields,
    event: event._id,
    area: area(fields.length as number, fields.width as number),
  }).catch(rethrowDuplicate('A stall with this number already exists for this event'));
  successResponse(res, stall, 'Stall created', 201);
});

// POST /stalls/admin/bulk { eventId, stalls: [...] } — all-or-nothing
export const createStallsBulk = asyncHandler(async (req: Request, res: Response) => {
  const event = await existingEvent(req.body?.eventId);
  const rows = req.body?.stalls;
  if (!Array.isArray(rows) || !rows.length) throw new AppError(400, 'stalls must be a non-empty array');
  if (rows.length > 500) throw new AppError(400, 'At most 500 stalls per request');

  const docs: Record<string, unknown>[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    try {
      const fields = stallFields(row ?? {}, false);
      docs.push({ ...fields, event: event._id, area: area(fields.length as number, fields.width as number) });
    } catch (error) {
      if (error instanceof AppError) errors.push(`Row ${i + 1}: ${error.message}`);
      else throw error;
    }
  });
  const numbers = docs.map((d) => String(d.stallNumber).toLowerCase());
  const repeated = numbers.filter((n, i) => numbers.indexOf(n) !== i);
  if (repeated.length) errors.push(`Stall numbers repeated in the upload: ${[...new Set(repeated)].join(', ')}`);
  const clashes = await StallModel.find({ event: event._id, stallNumber: { $in: docs.map((d) => d.stallNumber) } })
    .select('stallNumber')
    .lean();
  if (clashes.length) errors.push(`Already exist for this event: ${clashes.map((c) => c.stallNumber).join(', ')}`);
  if (errors.length) throw new AppError(400, errors.join(' | '));

  const created = await StallModel.insertMany(docs);
  successResponse(res, created, `${created.length} stalls created`, 201);
});

export const updateStall = asyncHandler(async (req: Request, res: Response) => {
  const stall = await StallModel.findById(idParam(req.params.id, 'stall'));
  if (!stall) throw new AppError(404, 'Stall not found');
  if (req.body?.eventId !== undefined && String(req.body.eventId) !== String(stall.event)) {
    throw new AppError(400, 'A stall cannot be moved to another event');
  }
  stall.set(stallFields(req.body ?? {}, true));
  stall.area = area(stall.length, stall.width);
  await stall.save().catch(rethrowDuplicate('A stall with this number already exists for this event'));
  successResponse(res, stall, 'Stall updated');
});

export const deleteStall = asyncHandler(async (req: Request, res: Response) => {
  const stall = await StallModel.findById(idParam(req.params.id, 'stall'));
  if (!stall) throw new AppError(404, 'Stall not found');
  if (stall.status === 'booked') throw new AppError(409, 'A booked stall cannot be deleted. Change its status first.');
  await stall.deleteOne();
  successResponse(res, null, 'Stall deleted');
});

/* ------------------------------ rates ------------------------------ */

// GET /stall-rates/admin?eventId=
export const listRates = asyncHandler(async (req: Request, res: Response) => {
  const rates = await StallRateModel.find({ event: idParam(req.query.eventId, 'event') }).sort({ stallType: 1, currency: 1 }).lean();
  successResponse(res, rates, 'Stall rates retrieved');
});

// PUT /stall-rates/admin { eventId, stallType, currency, ratePerSqm } — creates or updates that rate
export const upsertRate = asyncHandler(async (req: Request, res: Response) => {
  const event = await existingEvent(req.body?.eventId);
  const stallType = text(req.body?.stallType, 'Stall type', { max: 100 });
  const currency = String(req.body?.currency || '').toUpperCase();
  if (!(STALL_CURRENCIES as readonly string[]).includes(currency)) throw new AppError(400, 'Currency must be INR or USD');
  const ratePerSqm = number(req.body?.ratePerSqm, 'Rate per sq m', { min: 0 });

  const rate = await StallRateModel.findOneAndUpdate(
    { event: event._id, stallType, currency },
    { $set: { ratePerSqm } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  successResponse(res, rate, 'Stall rate saved');
});

export const deleteRate = asyncHandler(async (req: Request, res: Response) => {
  const rate = await StallRateModel.findByIdAndDelete(idParam(req.params.id, 'rate'));
  if (!rate) throw new AppError(404, 'Stall rate not found');
  successResponse(res, null, 'Stall rate deleted');
});
