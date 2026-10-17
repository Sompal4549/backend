import { Request, Response } from 'express';
import { SolutionModel } from '../models/solution.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { normalizeCityPages } from '../models/city-page.schema';

export const getAllSolutions = asyncHandler(async (_req: Request, res: Response) => {
  const solutions = await SolutionModel.find({ isActive: true }).sort({ orderBy: 1, createdAt: -1 });
  successResponse(res, solutions, 'Solutions retrieved');
});

// Admin list: inactive solutions included
export const getAllSolutionsAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const solutions = await SolutionModel.find().sort({ orderBy: 1, createdAt: -1 });
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
  const solution = await SolutionModel.create({ ...req.body, cities: normalizeCityPages(req.body.cities) });
  successResponse(res, solution, 'Solution created', 201);
});

export const updateSolution = asyncHandler(async (req: Request, res: Response) => {
  const body = { ...req.body };
  if ('cities' in body) body.cities = normalizeCityPages(body.cities);
  const solution = await SolutionModel.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!solution) throw new AppError(404, 'Solution not found');
  successResponse(res, solution, 'Solution updated');
});

export const deleteSolution = asyncHandler(async (req: Request, res: Response) => {
  const solution = await SolutionModel.findByIdAndDelete(req.params.id);
  if (!solution) throw new AppError(404, 'Solution not found');
  successResponse(res, null, 'Solution deleted');
});

// PUT /solutions/:id/cities — { cities }: replaces the solution's city pages
export const updateSolutionCities = asyncHandler(async (req: Request, res: Response) => {
  const solution = await SolutionModel.findByIdAndUpdate(
    req.params.id,
    { cities: normalizeCityPages(req.body.cities) },
    { new: true, runValidators: true }
  );
  if (!solution) throw new AppError(404, 'Solution not found');
  successResponse(res, solution.cities, 'City pages updated');
});
