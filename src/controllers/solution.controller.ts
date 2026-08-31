import { Request, Response } from 'express';
import { SolutionModel } from '../models/solution.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';

export const getAllSolutions = asyncHandler(async (_req: Request, res: Response) => {
  const solutions = await SolutionModel.find({ isActive: true }).sort({ createdAt: -1 });
  successResponse(res, solutions, 'Solutions retrieved');
});

export const getFeaturedSolutions = asyncHandler(async (_req: Request, res: Response) => {
  const solutions = await SolutionModel.find({ isActive: true, isFeatured: true }).limit(6);
  successResponse(res, solutions, 'Featured solutions retrieved');
});

export const getSolutionBySlug = asyncHandler(async (req: Request, res: Response) => {
  const solution = await SolutionModel.findOneAndUpdate(
    { slug: req.params.slug, isActive: true },
    { $inc: { viewCount: 1 } },
    { new: true }
  );
  if (!solution) throw new AppError(404, 'Solution not found');
  successResponse(res, solution, 'Solution retrieved');
});

export const createSolution = asyncHandler(async (req: Request, res: Response) => {
  const solution = await SolutionModel.create(req.body);
  successResponse(res, solution, 'Solution created', 201);
});

export const updateSolution = asyncHandler(async (req: Request, res: Response) => {
  const solution = await SolutionModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!solution) throw new AppError(404, 'Solution not found');
  successResponse(res, solution, 'Solution updated');
});

export const deleteSolution = asyncHandler(async (req: Request, res: Response) => {
  const solution = await SolutionModel.findByIdAndDelete(req.params.id);
  if (!solution) throw new AppError(404, 'Solution not found');
  successResponse(res, null, 'Solution deleted');
});
