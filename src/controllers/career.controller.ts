import { Request, Response } from 'express';
import { CareerModel } from '../models/career.model';
import { AuthRequest } from '../middlewares/auth.middleware';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';

export const getCareers = asyncHandler(async (_req: Request, res: Response) => {
  const careers = await CareerModel.find().sort({ createdAt: -1 }).lean();
  successResponse(res, careers, 'Careers retrieved');
});

export const createCareer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const career = await CareerModel.create(req.body);
  successResponse(res, career, 'Career created', 201);
});

export const updateCareer = asyncHandler(async (req: Request, res: Response) => {
  const career = await CareerModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!career) {
    throw new AppError(404, 'Career not found');
  }
  successResponse(res, career, 'Career updated');
});

export const deleteCareer = asyncHandler(async (req: Request, res: Response) => {
  const career = await CareerModel.findByIdAndDelete(req.params.id);
  if (!career) {
    throw new AppError(404, 'Career not found');
  }
  successResponse(res, null, 'Career deleted');
});
