import { Request, Response } from 'express';
import { CareerOptionModel, CAREER_OPTION_TYPES, CareerOptionType } from '../models/career-option.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { isObjectIdString } from '../utils/object-id';

/*
 * Notice Period / Joining Period / Expected CTC choices for the careers application form
 * (ensis-admin lib/careerOptionsApi.ts; website reads GET /careers/options).
 */

const isOptionType = (value: unknown): value is CareerOptionType =>
  typeof value === 'string' && (CAREER_OPTION_TYPES as readonly string[]).includes(value);

const typeFilter = (type: unknown): Record<string, unknown> => {
  if (type === undefined) return {};
  if (!isOptionType(type)) throw new AppError(400, 'Invalid option type');
  return { type };
};

const label = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) throw new AppError(400, 'Value is required');
  if (value.trim().length > 100) throw new AppError(400, 'Value must be 100 characters or fewer');
  return value.trim();
};

const optionId = (value: unknown): string => {
  if (!isObjectIdString(value)) throw new AppError(400, 'Invalid option id');
  return String(value);
};

const rethrowDuplicate = (error: any): never => {
  if (error?.code === 11000) throw new AppError(409, 'This value already exists for the selected type');
  throw error;
};

// GET /careers/options → active options grouped by type (?type=notice_period for one list)
export const getPublicCareerOptions = asyncHandler(async (req: Request, res: Response) => {
  const filter = { isActive: true, ...typeFilter(req.query.type) };
  const options = await CareerOptionModel.find(filter).sort({ order: 1, createdAt: 1 }).select('type label order').lean();
  if (req.query.type !== undefined) {
    successResponse(res, options, 'Career options retrieved');
    return;
  }
  const grouped: Record<string, unknown[]> = Object.fromEntries(CAREER_OPTION_TYPES.map((t) => [t, []]));
  for (const option of options) grouped[option.type].push(option);
  successResponse(res, grouped, 'Career options retrieved');
});

// GET /careers/admin/options?type=
export const getAdminCareerOptions = asyncHandler(async (req: Request, res: Response) => {
  const options = await CareerOptionModel.find(typeFilter(req.query.type)).sort({ type: 1, order: 1, createdAt: 1 }).lean();
  successResponse(res, options, 'Career options retrieved');
});

// POST /careers/admin/options { type, label, order?, isActive? }
export const createCareerOption = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (!isOptionType(body.type)) throw new AppError(400, 'Invalid option type');
  const option = await CareerOptionModel.create({
    type: body.type,
    label: label(body.label),
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    isActive: body.isActive === undefined ? true : Boolean(body.isActive),
  }).catch(rethrowDuplicate);
  successResponse(res, option, 'Option created', 201);
});

// PATCH /careers/admin/options/:id
export const updateCareerOption = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (body.type !== undefined) {
    if (!isOptionType(body.type)) throw new AppError(400, 'Invalid option type');
    update.type = body.type;
  }
  if (body.label !== undefined) update.label = label(body.label);
  if (body.order !== undefined && Number.isFinite(Number(body.order))) update.order = Number(body.order);
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);

  const option = await CareerOptionModel.findByIdAndUpdate(optionId(req.params.id), update, {
    new: true,
    runValidators: true,
  }).catch(rethrowDuplicate);
  if (!option) throw new AppError(404, 'Option not found');
  successResponse(res, option, 'Option updated');
});

// DELETE /careers/admin/options/:id
export const deleteCareerOption = asyncHandler(async (req: Request, res: Response) => {
  const option = await CareerOptionModel.findByIdAndDelete(optionId(req.params.id));
  if (!option) throw new AppError(404, 'Option not found');
  successResponse(res, null, 'Option deleted');
});
