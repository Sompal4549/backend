import { AppError } from '../utils/app-error';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { getRazorpayInstance } from '../config/razorpay.config';
import { config } from '../config/app.config';
import { OrderModel } from '../models/order.model';
import {
  createTransaction,
  findTransactionByRazorpayOrderId,
  findTransactionsByOrder,
  updateTransactionById,
} from '../repositories/transaction.repository';
import { updateOrderById } from '../repositories/order.repository';
import { markOrderPaymentFailed } from './order.service';
import { UserModel } from '../models/user.model';
import { sendWhatsAppMessage } from '../utils/whatsapp';

const toObjectId = (id: any): Types.ObjectId => {
  if (id instanceof Types.ObjectId) return id;
  if (id && typeof id === 'object' && id._id) return toObjectId(id._id);
  const idStr = String(id).trim();
  if (/^\d+$/.test(idStr) && idStr.length < 24) {
    const pad = '600000000000000000000000';
    return new Types.ObjectId(pad.substring(0, 24 - idStr.length) + idStr);
  }
  return new Types.ObjectId(idStr);
};

const normalizePhone = (phone: any): string => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  // Ensure 10-digit Indian numbers are prefixed with country code 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
};

/**
 * Create a Razorpay order for an existing internal order.
 * Called after the user places an order (order exists with paymentStatus = 'pending').
 */
export const createRazorpayOrder = async (userId: string, orderId: string) => {
  const order = await OrderModel.findById(toObjectId(orderId));

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  if (toObjectId(order.user).toString() !== toObjectId(userId).toString()) {
    throw new AppError(403, 'Unauthorized');
  }

  if (order.paymentStatus === 'paid') {
    throw new AppError(400, 'Order is already paid');
  }

  const razorpay = getRazorpayInstance();

  // Razorpay expects amount in paise (INR smallest unit)
  const amountInPaise = Math.round(order.totalAmount * 100);

  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: order._id.toString(),
    notes: {
      orderId: order._id.toString(),
      userId,
    },
  });

  // Create transaction record
  const transaction = await createTransaction({
    order: toObjectId(orderId),
    user: toObjectId(userId),
    razorpayOrderId: razorpayOrder.id,
    amount: amountInPaise,
    currency: 'INR',
    status: 'created',
  });

  // Link razorpay order ID and transaction to the order
  await updateOrderById(toObjectId(orderId).toString(), {
    razorpayOrderId: razorpayOrder.id,
    transactionId: transaction._id as Types.ObjectId,
  });

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: amountInPaise,
    currency: 'INR',
    keyId: config.razorpayKeyId,
    orderId: order._id,
  };
};

/**
 * Verify Razorpay payment signature after checkout widget completes.
 * The frontend sends razorpay_order_id, razorpay_payment_id, razorpay_signature.
 */
export const verifyPayment = async (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) => {
  // Step 1: Verify the signature
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpayKeySecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new AppError(400, 'Payment verification failed: invalid signature');
  }

  // Step 2: Find and update the transaction
  const transaction = await findTransactionByRazorpayOrderId(razorpayOrderId);

  if (!transaction) {
    throw new AppError(404, 'Transaction not found');
  }

  if (transaction.status === 'paid') {
    // Already verified — idempotent
    const order = await OrderModel.findById(transaction.order);
    return { transaction, order };
  }

  await updateTransactionById(transaction._id.toString(), {
    razorpayPaymentId,
    razorpaySignature,
    status: 'paid',
  });

  // Step 3: Update the order
  const updatedOrder = await updateOrderById(transaction.order.toString(), {
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
  });

  // Send WhatsApp Notification
  const user = await UserModel.findById(transaction.user);
  const recipientPhone = normalizePhone((updatedOrder?.shippingAddress as any)?.phone);
  console.log(`Attempting message for Order #${updatedOrder?._id}. Phone: ${recipientPhone}`);

  if (recipientPhone && updatedOrder) {
    console.log(`Sending Order Confirmation WhatsApp to: ${recipientPhone} (Source: Checkout)`);
    const message = `*Order Confirmed!*\n\nHello ${user?.name || 'Customer'},\n\nYour order #${updatedOrder._id} for ₹${updatedOrder.totalAmount} has been successfully placed.\n\nThank you for choosing Ensis!`;
    await sendWhatsAppMessage(recipientPhone, message, user?.name || null);
  } else if (!recipientPhone) {
    console.warn(`WhatsApp confirmation skipped for Order #${transaction.order}: No phone number found in shipping address.`);
  }
  return {
    transaction: {
      ...transaction.toObject(),
      razorpayPaymentId,
      razorpaySignature,
      status: 'paid',
    },
    order: updatedOrder,
  };
};

/**
 * Handle Razorpay webhook events (fallback for payment confirmation).
 * Verifies the webhook signature and processes payment.captured / payment.failed events.
 */
export const handleWebhook = async (rawBody: string, webhookSignature: string) => {
  if (!config.razorpayWebhookSecret) {
    throw new AppError(500, 'Webhook secret not configured');
  }

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', config.razorpayWebhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== webhookSignature) {
    throw new AppError(400, 'Invalid webhook signature');
  }

  const event = JSON.parse(rawBody);
  const eventType: string = event.event;
  const payment = event.payload?.payment?.entity;

  if (!payment) {
    return { acknowledged: true, event: eventType };
  }

  const razorpayOrderId: string = payment.order_id;
  const transaction = await findTransactionByRazorpayOrderId(razorpayOrderId);

  if (!transaction) {
    // Unknown transaction — acknowledge but don't process
    return { acknowledged: true, event: eventType, status: 'unknown_transaction' };
  }

  if (eventType === 'payment.captured') {
    if (transaction.status !== 'paid') {
      await updateTransactionById(transaction._id.toString(), {
        razorpayPaymentId: payment.id,
        status: 'paid',
        method: payment.method,
      });

      const updatedOrder = await updateOrderById(transaction.order.toString(), {
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
      });

      // Send WhatsApp Notification
      const user = await UserModel.findById(transaction.user);
      const recipientPhone = normalizePhone((updatedOrder?.shippingAddress as any)?.phone);

      if (recipientPhone && updatedOrder) {
        console.log(`Sending Order Confirmation WhatsApp to: ${recipientPhone} (Source: Webhook Checkout)`);
        const message = `*Order Confirmed!*\n\nHello ${user?.name || 'Customer'},\n\nYour order #${updatedOrder._id} for ₹${updatedOrder.totalAmount} has been successfully placed.\n\nThank you for choosing Ensis!`;
        await sendWhatsAppMessage(recipientPhone, message, user?.name || null);
      } else if (!recipientPhone) {
        console.warn(`WhatsApp webhook confirmation skipped: No phone number found.`);
      }
    }
  } else if (eventType === 'payment.failed') {
    if (transaction.status !== 'paid') {
      await updateTransactionById(transaction._id.toString(), {
        razorpayPaymentId: payment.id,
        status: 'failed',
        method: payment.method,
      });

      // Release the stock reserved by this pending order.
      await markOrderPaymentFailed(transaction.order.toString()).catch((err) =>
        console.error('Failed to release stock for unpaid order:', (err as Error).message)
      );
    }
  }

  return { acknowledged: true, event: eventType };
};

/**
 * Get payment/transaction details for a specific order.
 */
export const getPaymentStatus = async (userId: string, orderId: string) => {
  const order = await OrderModel.findById(orderId);

  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  if (order.user.toString() !== userId) {
    throw new AppError(403, 'Unauthorized');
  }

  const transactions = await findTransactionsByOrder(orderId);

  return {
    orderId: order._id,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    totalAmount: order.totalAmount,
    transactions,
  };
};
