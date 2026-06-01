import { Response } from 'express';
import { fetchCart, addItemToCart, updateCartItem, removeCartItem } from '../services/cart.service';
import { successResponse, errorResponse } from '../utils/api-response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await fetchCart(req.user!.id);
    successResponse(res, cart, 'Cart retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const addCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await addItemToCart(req.user!.id, req.params.productId, Number(req.body.quantity) || 1);
    successResponse(res, cart, 'Item added to cart');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const updateCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await updateCartItem(req.user!.id, req.params.productId, Number(req.body.quantity));
    successResponse(res, cart, 'Cart item updated');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const deleteCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await removeCartItem(req.user!.id, req.params.productId);
    successResponse(res, cart, 'Cart item removed');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
