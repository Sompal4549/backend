import { Request, Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { listProducts, getProduct, createNewProduct, updateProduct, removeProduct } from '../services/product.service';

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await listProducts(req.query);
  successResponse(res, result, 'Products retrieved');
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const product = await getProduct(req.params.id);
  successResponse(res, product, 'Product retrieved');
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await createNewProduct(req.body);
  successResponse(res, product, 'Product created', 201);
});

export const updateProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const product = await updateProduct(req.params.id, req.body);
  successResponse(res, product, 'Product updated');
});

export const deleteProductHandler = asyncHandler(async (req: Request, res: Response) => {
  await removeProduct(req.params.id);
  successResponse(res, null, 'Product deleted');
});
