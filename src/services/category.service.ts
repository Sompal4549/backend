import { CategoryModel, ICategory } from '../models/category.model.ts';
import { generateSlug } from '../utils/generate-slug.ts';

export const listCategories = async () => {
  return CategoryModel.find().sort({ name: 1 });
};

export const createCategory = async (payload: Partial<ICategory>) => {
  const existing = await CategoryModel.findOne({ name: payload.name });
  if (existing) return existing;
  return CategoryModel.create(payload);
};

export const updateCategory = async (categoryId: string, payload: Partial<ICategory>) => {
  const update: Partial<ICategory> = { ...payload };
  if (payload.name) {
    update.slug = generateSlug(payload.name);
  }

  const category = await CategoryModel.findByIdAndUpdate(categoryId, update, { new: true, runValidators: true });
  if (!category) {
    const error = new Error('Category not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return category;
};

export const deleteCategory = async (categoryId: string) => {
  const category = await CategoryModel.findByIdAndDelete(categoryId);
  if (!category) {
    const error = new Error('Category not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return category;
};
