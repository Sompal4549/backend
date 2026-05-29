import { Router } from 'express';
import { getCart, addCartItem, updateCart, deleteCartItem } from '../controllers/cart.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware.js';

export const cartRouter = Router();

cartRouter.use(authMiddleware);
cartRouter.get('/', getCart);
cartRouter.post(
  '/:productId',
  [body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1')],
  validateRequest,
  addCartItem
);
cartRouter.put(
  '/:productId',
  [body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')],
  validateRequest,
  updateCart
);
cartRouter.delete('/:productId', deleteCartItem);
