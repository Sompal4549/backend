import { Request, Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../services/category.service';

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  // ?all=1 (admin list) also returns hidden categories with product counts
  const categories = await listCategories({ includeInactive: req.query.all === '1' });
  successResponse(res, categories, 'Categories retrieved');
});

export const addCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await createCategory(req.body);
  successResponse(res, category, 'Category created', 201);
});

export const editCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await updateCategory(req.params.id, req.body);
  successResponse(res, category, 'Category updated');
});

export const removeCategory = asyncHandler(async (req: Request, res: Response) => {
  await deleteCategory(req.params.id);
  successResponse(res, null, 'Category deleted');
});
