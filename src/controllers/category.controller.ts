import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/api-response.ts';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../services/category.service.ts';

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await listCategories();
    successResponse(res, categories, 'Categories retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const addCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await createCategory(req.body);
    successResponse(res, category, 'Category created', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const editCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    successResponse(res, category, 'Category updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const removeCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteCategory(req.params.id);
    successResponse(res, null, 'Category deleted');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
