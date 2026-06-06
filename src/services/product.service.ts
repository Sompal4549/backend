import { createProduct, getActiveProductByIdOrSlug, updateProductById, deleteProductById, getProducts, countProducts, searchProducts } from '../repositories/product.repository.ts';
import { getPagination } from '../utils/pagination.ts';
import { IProduct } from '../models/product.model.ts';

export const listProducts = async (query: any) => {
  const { page, limit, sortBy, order, search, category, minPrice, maxPrice } = query;
  const pagination = getPagination({ page, limit, sortBy, order });
  const filter: any = { isActive: true };
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
    const error = new Error('Product not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return product;
};

export const createNewProduct = async (payload: Partial<IProduct>) => {
  return createProduct(payload);
};

export const updateProduct = async (productId: string, payload: Partial<IProduct>) => {
  const product = await updateProductById(productId, payload);
  if (!product) {
    const error = new Error('Product not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return product;
};

export const removeProduct = async (productId: string) => {
  const product = await deleteProductById(productId);
  if (!product) {
    const error = new Error('Product not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return product;
};
