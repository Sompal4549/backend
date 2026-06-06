import { Router, Request, Response, NextFunction } from 'express';
import { createOrder, getMyOrders, getOrderById } from '../controllers/order.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware.js';

export const orderRouter = Router();

orderRouter.post(
  '/',
  authMiddleware,
  [
    body('shippingAddress.label').notEmpty().withMessage('Shipping label is required'),
    body('shippingAddress.street').notEmpty().withMessage('Street is required'),
    body('shippingAddress.city').notEmpty().withMessage('City is required'),
    body('shippingAddress.state').notEmpty().withMessage('State is required'),
    body('shippingAddress.postalCode').notEmpty().withMessage('Postal code is required'),
    body('shippingAddress.country').notEmpty().withMessage('Country is required'),
    body('shippingAddress.phone').notEmpty().withMessage('Phone number for delivery is required'),
    body('paymentStatus').optional().isIn(['pending', 'paid', 'failed']).withMessage('Invalid payment status'),
    body('orderStatus')
      .optional()
      .isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
  ],
  validateRequest,
  createOrder
);
orderRouter.get('/', authMiddleware, getMyOrders);
orderRouter.get('/my-orders', authMiddleware, getMyOrders);
orderRouter.get('/:id', authMiddleware, [param('id').isMongoId().withMessage('Valid order id is required')], validateRequest, getOrderById);

// Allow user to update their own order status (limited actions, e.g., cancel)
orderRouter.put(
  '/:id',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('Valid order id is required'),
    body('orderStatus').notEmpty().isIn(['cancelled']).withMessage('Invalid order status for user updates'),
  ],
  validateRequest,
  // Controller handler
  (req: Request, res: Response, next: NextFunction) => require('../controllers/order.controller.js').updateOrderByUser(req, res).catch(next)
);
