import { Request, Response } from 'express';
import { ProjectModel } from '../models/project.model';
import { successResponse, errorResponse } from '../utils/api-response';

export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const projects = await ProjectModel.find().sort({ createdAt: -1 }).lean();
    successResponse(res, projects, 'Projects retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await ProjectModel.create(req.body);
    successResponse(res, project, 'Project created', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, 400);
  }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await ProjectModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) {
      errorResponse(res, 'Project not found', 404);
      return;
    }
    successResponse(res, project, 'Project updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, 400);
  }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await ProjectModel.findByIdAndDelete(req.params.id);
    if (!project) {
      errorResponse(res, 'Project not found', 404);
      return;
    }
    successResponse(res, null, 'Project deleted');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};