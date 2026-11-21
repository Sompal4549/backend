import { Request, Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  createCategory,
  deleteCategory,
  listCategories,
  restoreCategory,
  updateCategory,
} from '../services/category.service';

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  // ?all=1 (admin list) also returns hidden categories with product counts
  // ?includeDeleted=1 also returns soft-deleted categories
  const categories = await listCategories({
    includeInactive: req.query.all === '1',
    includeDeleted: req.query.includeDeleted === '1',
  });
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

export const removeCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const deletedBy = (req.user as any)?._id?.toString();
  await deleteCategory(req.params.id, deletedBy);
  successResponse(res, null, 'Category moved to deleted list');
});

export const restoreCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const category = await restoreCategory(req.params.id);
  successResponse(res, category, 'Category restored successfully');
});
