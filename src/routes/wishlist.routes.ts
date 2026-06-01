import { Router } from 'express';
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/wishlist.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const wishlistRouter = Router();

wishlistRouter.use(authMiddleware);
wishlistRouter.post('/:productId', addToWishlist);
wishlistRouter.delete('/:productId', removeFromWishlist);
wishlistRouter.get('/', getWishlist);
