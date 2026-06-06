import { Router } from 'express';
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlist.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';

export const wishlistRouter = Router();

wishlistRouter.use(authMiddleware);
wishlistRouter.post('/:productId', addToWishlist);
wishlistRouter.delete('/:productId', removeFromWishlist);
wishlistRouter.get('/', getWishlist);
