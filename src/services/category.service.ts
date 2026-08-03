import { AppError } from '../utils/app-error';
import { CategoryModel, ICategory } from '../models/category.model';

export const listCategories = async () => {
  return CategoryModel.find().sort({ name: 1 });
};

export const createCategory = async (payload: Partial<ICategory>) => {
  const existing = await CategoryModel.findOne({ name: payload.name });
  if (existing) return existing;
  return CategoryModel.create(payload);
};

export const updateCategory = async (categoryId: string, payload: Partial<ICategory>) => {
  const category = await CategoryModel.findByIdAndUpdate(categoryId, payload, { new: true, runValidators: true });
  if (!category) {
    throw new AppError(404, 'Category not found');
  }
  return category;
};

export const deleteCategory = async (categoryId: string) => {
  const category = await CategoryModel.findByIdAndDelete(categoryId);
  if (!category) {
    throw new AppError(404, 'Category not found');
  }
  return category;
};