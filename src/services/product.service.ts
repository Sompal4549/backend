import { AppError } from '../utils/app-error';
import { createProduct, getActiveProductByIdOrSlug, updateProductById, deleteProductById, getProducts, countProducts, searchProducts } from '../repositories/product.repository';
import { getPagination } from '../utils/pagination';
import { IProduct } from '../models/product.model';
import { createProductBackup } from './product-backup.service';

export const listProducts = async (query: any) => {
  const { page, limit, sortBy, order, search, category, minPrice, maxPrice } = query;
  const pagination = getPagination({ page, limit, sortBy, order });
  const filter: any = {};
  if (category) filter.category = category;
  if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
  if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };

  const products = search
    ? await searchProducts(search, filter, pagination.skip, pagination.limit, pagination.sort)
    : await getProducts(filter, pagination.skip, pagination.limit, pagination.sort);
  const total = await countProducts(filter);
  return { products, total, page: pagination.page, limit: pagination.limit };
};

export const getProduct = async (productId: string) => {
  const product = await getActiveProductByIdOrSlug(productId);
  if (!product) {
    throw new AppError(404, 'Product not found');
  }
  return product;
};

export const createNewProduct = async (payload: Partial<IProduct>) => {
  return createProduct(payload);
};

export const updateProduct = async (productId: string, payload: Partial<IProduct>, updatedBy?: string) => {
  // Auto-backup before every update so previous state is always recoverable
  await createProductBackup(productId, updatedBy, 'auto-before-update').catch(() => {
    // Backup failure should not block the update
  });

  const product = await updateProductById(productId, payload);
  if (!product) {
    throw new AppError(404, 'Product not found');
  }
  return product;
};

export const removeProduct = async (productId: string, deletedBy?: string) => {
  // Backup before delete so the product can be recovered if needed
  await createProductBackup(productId, deletedBy, 'auto-before-delete').catch(() => {});

  const product = await deleteProductById(productId);
  if (!product) {
    throw new AppError(404, 'Product not found');
  }
  return product;
};
