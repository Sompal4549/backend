import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/api-response.ts';
import { listProducts, getProduct, createNewProduct, updateProduct, removeProduct } from '../services/product.service.ts';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await listProducts(req.query);
    successResponse(res, result, 'Products retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await getProduct(req.params.id);
    successResponse(res, product, 'Product retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await createNewProduct(req.body);
    successResponse(res, product, 'Product created', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const updateProductHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await updateProduct(req.params.id, req.body);
    successResponse(res, product, 'Product updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const deleteProductHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    await removeProduct(req.params.id);
    successResponse(res, null, 'Product deleted');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
