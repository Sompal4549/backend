import { Response } from 'express';
import { addWishlistItem, deleteWishlistItem, fetchWishlist } from '../services/wishlist.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  const wishlist = await fetchWishlist(req.user!.id);
  successResponse(res, wishlist, 'Wishlist retrieved');
});

export const addToWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  const wishlist = await addWishlistItem(req.user!.id, req.params.productId);
  successResponse(res, wishlist, 'Product added to wishlist');
});

export const removeFromWishlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  const wishlist = await deleteWishlistItem(req.user!.id, req.params.productId);
  successResponse(res, wishlist, 'Product removed from wishlist');
});
