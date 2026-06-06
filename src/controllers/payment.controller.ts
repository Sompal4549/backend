import { Request, Response } from 'express';
import {
  createRazorpayOrder,
  verifyPayment as verifyPaymentService,
  handleWebhook as handleWebhookService,
  getPaymentStatus,
} from '../services/payment.service.ts';
import { successResponse, errorResponse } from '../utils/api-response.ts';
import { AuthRequest } from '../middlewares/auth.middleware.ts';

/**
 * POST /api/v1/payments/create-order
 * Create a Razorpay order for an existing internal order.
 * Body: { orderId: string }
 */
export const initiatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;
    const result = await createRazorpayOrder(req.user!.id, orderId);
    successResponse(res, result, 'Razorpay order created', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

/**
 * POST /api/v1/payments/verify
 * Verify payment after Razorpay checkout widget completes.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export const verifyPaymentHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const result = await verifyPaymentService(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    successResponse(res, result, 'Payment verified successfully');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

/**
 * POST /api/v1/payments/webhook
 * Razorpay webhook callback — no auth, uses raw body + signature header.
 */
export const webhookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      errorResponse(res, 'Missing webhook signature', 400);
      return;
    }

    // Use the raw body captured by the express.json verify function for accurate signature check
    const rawBody = (req as any).rawBody?.toString('utf-8') || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const result = await handleWebhookService(rawBody, signature);
    successResponse(res, result, 'Webhook processed');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

/**
 * GET /api/v1/payments/:orderId
 * Get payment/transaction status for an order.
 */
export const getPaymentStatusHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await getPaymentStatus(req.user!.id, req.params.orderId);
    successResponse(res, result, 'Payment status retrieved');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
