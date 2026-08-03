import { Request, Response } from 'express';
import {
  createRazorpayOrder,
  verifyPayment as verifyPaymentService,
  handleWebhook as handleWebhookService,
  getPaymentStatus,
} from '../services/payment.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * POST /api/v1/payments/create-order
 * Create a Razorpay order for an existing internal order.
 * Body: { orderId: string }
 */
export const initiatePayment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { orderId } = req.body;
  const result = await createRazorpayOrder(req.user!.id, orderId);
  successResponse(res, result, 'Razorpay order created', 201);
});

/**
 * POST /api/v1/payments/verify
 * Verify payment after Razorpay checkout widget completes.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export const verifyPaymentHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const result = await verifyPaymentService(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );
  successResponse(res, result, 'Payment verified successfully');
});

/**
 * POST /api/v1/payments/webhook
 * Razorpay webhook callback — no auth, uses raw body + signature header.
 */
export const webhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    throw new AppError(400, 'Missing webhook signature');
  }

  // Use the raw body captured by the express.json verify function for accurate signature check
  const rawBody = (req as any).rawBody?.toString('utf-8') || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  const result = await handleWebhookService(rawBody, signature);
  successResponse(res, result, 'Webhook processed');
});

/**
 * GET /api/v1/payments/:orderId
 * Get payment/transaction status for an order.
 */
export const getPaymentStatusHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await getPaymentStatus(req.user!.id, req.params.orderId);
  successResponse(res, result, 'Payment status retrieved');
});
