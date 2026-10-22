import { Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import { pick } from '../utils/pick';
import {
  listProducts,
  getProduct,
  createNewProduct,
  updateProduct,
  removeProduct,
  restoreProduct,
  permanentDeleteProduct,
} from '../services/product.service';

const PRODUCT_EDITABLE_FIELDS = [
  'title', 'slug', 'code', 'hsnCode', 'description', 'shortDescription',
  'price', 'discountPrice', 'gstRate', 'category', 'subcategory', 'subCategory',
  'material', 'weight', 'images', 'stock', 'tags', 'isActive', 'isFeatured',
  'orderBy', 'overview', 'cities',
] as const;

export const getProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await listProducts(req.query);
  successResponse(res, result, 'Products retrieved');
});

export const getProductById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await getProduct(req.params.id);
  successResponse(res, product, 'Product retrieved');
});

export const createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cleanData = pick(req.body, PRODUCT_EDITABLE_FIELDS);
  if (typeof cleanData.tags === 'string') {
    cleanData.tags = cleanData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }
  if (cleanData.subCategory && !cleanData.subcategory) {
    cleanData.subcategory = cleanData.subCategory;
  }
  const product = await createNewProduct(cleanData);
  successResponse(res, product, 'Product created', 201);
});

export const updateProductHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cleanData = pick(req.body, PRODUCT_EDITABLE_FIELDS);
  if (typeof cleanData.tags === 'string') {
    cleanData.tags = cleanData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }
  // Clean up empty optional fields
  if (cleanData.subCategory === '' || cleanData.subcategory === '') {
    cleanData.subCategory = undefined;
    cleanData.subcategory = undefined;
  } else if (cleanData.subCategory && !cleanData.subcategory) {
    cleanData.subcategory = cleanData.subCategory;
  }

  const expectedUpdatedAt = req.body?.updatedAt;
  const userId = (req.user as any)?._id?.toString();
  const product = await updateProduct(req.params.id, cleanData, userId, expectedUpdatedAt);
  successResponse(res, product, 'Product updated');
});

export const deleteProductHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  await removeProduct(req.params.id, userId);
  successResponse(res, null, 'Product moved to deleted list');
});

export const restoreProductHandler = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const product = await restoreProduct(_req.params.id);
  successResponse(res, product, 'Product restored successfully');
});

export const permanentDeleteProductHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  await permanentDeleteProduct(req.params.id, userId);
  successResponse(res, null, 'Product permanently deleted');
});
