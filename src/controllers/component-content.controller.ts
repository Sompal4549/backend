import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/api-response.js';
import {
  deleteComponentContent,
  getComponentContentByKey,
  listComponentContent,
  updateComponentContent,
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
