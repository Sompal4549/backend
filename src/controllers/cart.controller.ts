import { Response } from 'express';
import { fetchCart, addItemToCart, updateCartItem, removeCartItem } from '../services/cart.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cart = await fetchCart(req.user!.id);
  successResponse(res, cart, 'Cart retrieved');
});

export const addCartItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cart = await addItemToCart(req.user!.id, req.params.productId, Number(req.body.quantity) || 1);
  successResponse(res, cart, 'Item added to cart');
});

export const updateCart = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cart = await updateCartItem(req.user!.id, req.params.productId, Number(req.body.quantity));
  successResponse(res, cart, 'Cart item updated');
});

export const deleteCartItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cart = await removeCartItem(req.user!.id, req.params.productId);
  successResponse(res, cart, 'Cart item removed');
});
