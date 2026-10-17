import { AppError } from '../utils/app-error';
import { CategoryModel, ICategory } from '../models/category.model';
import { ProductModel } from '../models/product.model';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const EDITABLE_FIELDS = ['name', 'slug', 'image', 'isActive'] as const;

const pickEditable = (payload: Record<string, unknown>) => {
  const data: Partial<ICategory> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in payload) (data as Record<string, unknown>)[field] = payload[field];
  }
  if (typeof data.name === 'string') data.name = data.name.trim();
  if (typeof data.slug === 'string') data.slug = slugify(data.slug);
  return data;
};

const assertSlugFree = async (slug: string, exceptId?: string) => {
  const clash = await CategoryModel.findOne({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).lean();
  if (clash) throw new AppError(409, `Another category already uses the address "${slug}"`);
};

/** Website: active categories only. Admin (includeInactive): all, with product counts. */
export const listCategories = async (options: { includeInactive?: boolean } = {}) => {
  const categories = await CategoryModel.find(options.includeInactive ? {} : { isActive: { $ne: false } })
    .sort({ name: 1 })
    .lean();
  if (!options.includeInactive) return categories;

  const counts = await ProductModel.aggregate<{ _id: unknown; count: number }>([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const byCategory = new Map(counts.map((c) => [String(c._id), c.count]));
  return categories.map((category) => ({ ...category, productCount: byCategory.get(String(category._id)) || 0 }));
};

export const createCategory = async (payload: Record<string, unknown>) => {
  const data = pickEditable(payload);
  if (!data.name) throw new AppError(400, 'Category name is required');
  data.slug = data.slug || slugify(data.name);
  if (!data.slug) throw new AppError(400, 'Category name must contain letters or numbers');
  const sameName = await CategoryModel.findOne({ name: data.name }).collation({ locale: 'en', strength: 2 }).lean();
  if (sameName) throw new AppError(409, `A category named "${data.name}" already exists`);
  await assertSlugFree(data.slug);
  return CategoryModel.create(data);
};

export const updateCategory = async (categoryId: string, payload: Record<string, unknown>) => {
  const data = pickEditable(payload);
  if ('name' in data && !data.name) throw new AppError(400, 'Category name is required');
  if ('slug' in data) {
    if (!data.slug) throw new AppError(400, 'Category address (slug) is required');
    await assertSlugFree(data.slug, categoryId);
  }
  const category = await CategoryModel.findByIdAndUpdate(categoryId, data, { new: true, runValidators: true });
  if (!category) {
    throw new AppError(404, 'Category not found');
  }
  return category;
};

export const deleteCategory = async (categoryId: string) => {
  // Products require a category, so removing one still in use would orphan them
  const inUse = await ProductModel.countDocuments({ category: categoryId });
  if (inUse) {
    throw new AppError(409, `${inUse} product${inUse === 1 ? ' uses' : 's use'} this category. Move them to another category first, or hide the category instead.`);
  }
  const category = await CategoryModel.findByIdAndDelete(categoryId);
  if (!category) {
    throw new AppError(404, 'Category not found');
  }
  return category;
};
