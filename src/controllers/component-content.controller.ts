import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/api-response.js';
import { ComponentContentModel } from '../models/component-content.model.js';
import {
  deleteComponentContent,
  deleteHomeComponentContent,
  getComponentContentByKey,
  getHomeComponentContentByKey,
  listHomeComponentContent,
  listComponentContent,
  saveHomeComponentContent,
  updateComponentContent,
  updateHomeComponentContent,
  upsertComponentContent,
} from '../services/component-content.service.js';

export const getComponentContents = async (req: Request, res: Response): Promise<void> => {
  try {
    const contents = await listComponentContent(req.query);
    successResponse(res, contents, 'Component contents retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const getComponentsByPage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page } = req.params;
    const contents = await ComponentContentModel.find({ page, isActive: true }).lean();
    successResponse(res, contents, `Components for page: ${page} retrieved`);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const getComponentContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const content = await getComponentContentByKey(req.params.key);
    successResponse(res, content, 'Component content retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const saveComponentContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const content = await upsertComponentContent(req.body);
    successResponse(res, content, 'Component content saved', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const editComponentContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const content = await updateComponentContent(req.params.id, req.body);
    successResponse(res, content, 'Component content updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const removeComponentContent = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteComponentContent(req.params.id);
    successResponse(res, null, 'Component content deleted');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const getHomeComponentContents = async (req: Request, res: Response): Promise<void> => {
  try {
    const contents = await listHomeComponentContent(req.query);
    successResponse(res, contents, 'Home component contents retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const getHomeComponentContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const content = await getHomeComponentContentByKey(req.params.key);
    successResponse(res, content, 'Home component content retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const saveHomeComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const content = await saveHomeComponentContent(req.body);
    successResponse(res, content, 'Home component content saved', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const editHomeComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const content = await updateHomeComponentContent(req.params.id, req.body);
    successResponse(res, content, 'Home component content updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const removeHomeComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteHomeComponentContent(req.params.id);
    successResponse(res, null, 'Home component content deleted');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
