import { Router } from 'express';
import express from 'express';
import { body, param } from 'express-validator';
import {
  initiatePayment,
  verifyPaymentHandler,
  webhookHandler,
  getPaymentStatusHandler,
} from '../controllers/payment.controller';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { validateRequest } from '../middlewares/validate.middleware.ts';

export const paymentRouter = Router();

// Create Razorpay order for an existing internal order
paymentRouter.post(
  '/create-order',
  authMiddleware,
  [body('orderId').isMongoId().withMessage('Valid order ID is required')],
  validateRequest,
  initiatePayment
);

// Verify payment after Razorpay checkout
paymentRouter.post(
  '/verify',
  authMiddleware,
  [
    body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID is required'),
    body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID is required'),
    body('razorpay_signature').notEmpty().withMessage('Razorpay signature is required'),
  ],
  validateRequest,
  verifyPaymentHandler
);

// Razorpay webhook — raw body required for signature verification, no auth
paymentRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  webhookHandler
);

// Get payment status for an order
paymentRouter.get(
  '/:orderId',
  authMiddleware,
  [param('orderId').isMongoId().withMessage('Valid order ID is required')],
  validateRequest,
  getPaymentStatusHandler
);
