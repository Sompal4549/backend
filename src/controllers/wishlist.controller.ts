import { Response } from 'express';
import { addWishlistItem, deleteWishlistItem, fetchWishlist } from '../services/wishlist.service';
import { successResponse, errorResponse } from '../utils/api-response';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wishlist = await fetchWishlist(req.user!.id);
    successResponse(res, wishlist, 'Wishlist retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const addToWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wishlist = await addWishlistItem(req.user!.id, req.params.productId);
    successResponse(res, wishlist, 'Product added to wishlist');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wishlist = await deleteWishlistItem(req.user!.id, req.params.productId);
    successResponse(res, wishlist, 'Product removed from wishlist');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};
