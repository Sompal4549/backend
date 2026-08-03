import { Request, Response } from 'express';
import { ProjectModel } from '../models/project.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';

export const getProjects = asyncHandler(async (_req: Request, res: Response) => {
  const projects = await ProjectModel.find().sort({ createdAt: -1 }).lean();
  successResponse(res, projects, 'Projects retrieved');
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await ProjectModel.create(req.body);
  successResponse(res, project, 'Project created', 201);
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await ProjectModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!project) {
    throw new AppError(404, 'Project not found');
  }
  successResponse(res, project, 'Project updated');
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await ProjectModel.findByIdAndDelete(req.params.id);
  if (!project) {
    throw new AppError(404, 'Project not found');
  }
  successResponse(res, null, 'Project deleted');
});
