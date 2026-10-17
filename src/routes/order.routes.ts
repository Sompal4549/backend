import { Router } from 'express';
import { createOrder, getMyOrders, getOrderById, updateOrderByUser, getOrdersByLeadCtrl, sendOrderEmailCtrl, sendOrderWhatsAppCtrl, getAllOrdersAdmin, dispatchOrder } from '../controllers/order.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

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
    body('idempotencyKey')
      .notEmpty()
      .isLength({ min: 8, max: 128 })
      .withMessage('Idempotency key is required'),
    // Validate items array if present
    body('items')
      .optional({ checkFalsy: true })
      .isArray({ min: 1 })
      .withMessage('Items must be an array with at least one item if provided'),
    body('items.*.product')
      .notEmpty()
      .withMessage('Product is required for each item'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('items.*.finish').optional().isString().withMessage('Finish must be a string'),
    body('items.*.size').optional().isString().withMessage('Size must be a string'),
  ],
  validateRequest,
  createOrder
);
orderRouter.get('/', authMiddleware, getMyOrders);
orderRouter.get('/my-orders', authMiddleware, getMyOrders);
orderRouter.get('/lead/:leadId', authMiddleware, adminMiddleware, [param('leadId').notEmpty().withMessage('Lead ID is required')], validateRequest, getOrdersByLeadCtrl);
orderRouter.get('/:id', authMiddleware, [param('id').isMongoId().withMessage('Valid order id is required')], validateRequest, getOrderById);

// NEW: Admin endpoints
orderRouter.get('/admin/all', authMiddleware, adminMiddleware, getAllOrdersAdmin);
orderRouter.patch('/:id/dispatch', authMiddleware, adminMiddleware, [
  param('id').isMongoId().withMessage('Valid order id is required'),
  body('trackingNumber').notEmpty().withMessage('Tracking number is required'),
  body('courierPartner').notEmpty().withMessage('Courier partner is required'),
], validateRequest, dispatchOrder);

// Send order via email
orderRouter.post('/:id/send-email', authMiddleware, adminMiddleware, [
  param('id').notEmpty().withMessage('Order ID is required'),
], validateRequest, sendOrderEmailCtrl);

// Send order via WhatsApp
orderRouter.post('/:id/send-whatsapp', authMiddleware, adminMiddleware, [
  param('id').notEmpty().withMessage('Order ID is required'),
], validateRequest, sendOrderWhatsAppCtrl);

// Allow users to cancel their own order; admins may update any order's status.
orderRouter.put(
  '/:id',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('Valid order id is required'),
    body('orderStatus')
      .optional()
      .isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid order status'),
    body('paymentStatus').optional().isIn(['pending', 'paid', 'failed']).withMessage('Invalid payment status'),
  ],
  validateRequest,
  updateOrderByUser
);
