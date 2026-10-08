import { Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import { listProducts, getProduct, createNewProduct, updateProduct, removeProduct } from '../services/product.service';

export const getProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await listProducts(req.query);
  successResponse(res, result, 'Products retrieved');
});

export const getProductById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const product = await getProduct(req.params.id);
  successResponse(res, product, 'Product retrieved');
});

export const createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }
  const product = await createNewProduct(req.body);
  successResponse(res, product, 'Product created', 201);
});

export const updateProductHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (typeof req.body.tags === 'string') {
    req.body.tags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }
  const userId = (req.user as any)?._id?.toString();
  const product = await updateProduct(req.params.id, req.body, userId);
  successResponse(res, product, 'Product updated');
});

export const deleteProductHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  await removeProduct(req.params.id, userId);
  successResponse(res, null, 'Product deleted');
});
