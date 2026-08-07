import { createOrder, getOrdersByUser, getOrderById } from '../repositories/order.repository';
import { IOrder } from '../models/order.model';
import { CartModel } from '../models/cart.model';
import { UserModel } from '../models/user.model';
import { ProductModel } from '../models/product.model';
import mongoose, { Types, ClientSession } from 'mongoose';
import { sendWhatsAppMessage } from '../utils/whatsapp';
import { AppError } from '../utils/app-error';

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
 * Runs the given work inside a MongoDB transaction when the deployment supports it
 * (replica set / Atlas). Falls back to non-transactional execution on standalone
 * MongoDB (e.g. local development), where the atomic stock guard still prevents overselling.
 */
const TRANSACTION_UNSUPPORTED = /transaction numbers are only allowed|not supported on this deployment|standalone/i;

const runWithTransaction = async <T>(fn: (session: ClientSession | null) => Promise<T>): Promise<T> => {
  const session = await mongoose.startSession();
  try {
    try {
      session.startTransaction();
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      await session.abortTransaction().catch(() => undefined);
      if (TRANSACTION_UNSUPPORTED.test((err as Error)?.message ?? '')) {
        return fn(null);
      }
      throw err;
    }
  } finally {
    session.endSession();
  }
};

interface OrderItemInput {
  product: unknown;
  quantity: number;
}

const toProductId = (value: unknown): Types.ObjectId => {
  const idStr = String(value ?? '').trim();
  if (/^\d+$/.test(idStr) && idStr.length < 24) return toObjectId(idStr);
  if (Types.ObjectId.isValid(idStr)) return new Types.ObjectId(idStr);
  throw new AppError(400, 'Invalid order items');
};

const getCartItems = async (userId: string): Promise<OrderItemInput[]> => {
  const cart = await CartModel.findOne({ user: toObjectId(userId) });
  if (!cart || cart.items.length === 0) {
    throw new AppError(400, 'Cart is empty');
  }
  return cart.items.map((item: any) => ({ product: item.product, quantity: Number(item.quantity) }));
};

export const placeOrder = async (userId: string, payload: Partial<IOrder>) => {
  const { shippingAddress, paymentStatus, orderStatus, trackingNumber } = payload;
  if (!shippingAddress) {
    throw new AppError(400, 'Shipping address is required');
  }

  const fromCart = !Array.isArray(payload.items) || payload.items.length === 0;
  const sourceItems: OrderItemInput[] = fromCart
    ? await getCartItems(userId)
    : (payload.items ?? []).map((item: any) => ({ product: item.product, quantity: Number(item.quantity) }));

  // Server truth: price, name, availability and stock come from the catalog only.
  const productIds = sourceItems.map((item) => toProductId(item.product));
  const products = await ProductModel.find({ _id: { $in: productIds }, isActive: true }).lean();
  const priceMap = new Map(products.map((product) => [product._id.toString(), product]));

  const items = sourceItems.map((item) => {
    const product = priceMap.get(toProductId(item.product).toString());
    if (!product) {
      throw new AppError(400, 'One or more products are unavailable');
    }
    const quantity = Math.floor(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new AppError(400, 'Invalid order quantity');
    }
    if ((product.stock ?? 0) < quantity) {
      throw new AppError(400, `Insufficient stock for ${product.title}`);
    }
    return {
      product: product._id,
      name: product.title,
      quantity,
      price: product.price,
      gstRate: product.gstRate ?? 5,
    };
  });

  const subtotal = items.reduce((total, item) => total + item.quantity * item.price, 0);
  const serverTax = Math.round(
    items.reduce((total, item) => total + item.quantity * item.price * (item.gstRate ?? 5) / 100, 0)
  );
  const tax = Math.round(Number(payload.tax) || 0) || serverTax;
  const discount = Math.round(Number(payload.discount) || 0);
  const couponDiscount = Math.round(Number(payload.couponDiscount) || 0);
  const shipping = Math.round(Number(payload.shipping) || 0);
  const totalAmount = Math.max(0, subtotal - discount - couponDiscount + shipping + tax);

  const order = await runWithTransaction(async (session) => {
    const created = await createOrder(
      {
        user: toObjectId(userId),
        items,
        totalAmount,
        discount,
        couponDiscount,
        shipping,
        tax,
        paymentStatus: paymentStatus || 'pending',
        orderStatus: orderStatus || 'pending',
        shippingAddress: shippingAddress as any,
        trackingNumber,
      },
      session
    );

    // Atomic oversell guard: decrement only if enough stock remains.
    for (const item of items) {
      const result = await ProductModel.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session }
      );
      if (result.modifiedCount === 0) {
        throw new AppError(400, `Insufficient stock for ${item.name}`);
      }
    }

    await UserModel.updateOne(
      { _id: toObjectId(userId) },
      { $addToSet: { orders: created._id } },
      { session }
    );

    if (fromCart) {
      await CartModel.updateOne(
        { user: toObjectId(userId) },
        { $set: { items: [], totalAmount: 0 } },
        { session }
      );
    }

    return created;
  });

  // Use ONLY the phone number provided in the shipping address at checkout
  const recipientPhone = normalizePhone((shippingAddress as any)?.phone);

  if (recipientPhone) {
    const user = await UserModel.findById(toObjectId(userId)).select('name');
    const message = `*Order Received!*\n\nHello ${user?.name || 'Customer'},\n\nWe have received your order #${order._id} for ₹${order.totalAmount}. Status: ${order.paymentStatus}.\n\nThank you for choosing Ensis!`;
    await sendWhatsAppMessage(recipientPhone, message, user?.name || null).catch((err) =>
      console.error('WhatsApp notification failed:', (err as Error).message)
    );
  } else {
    console.warn(`WhatsApp notification skipped for Order #${order._id}: No phone number found.`);
  }

  return order;
};

export const fetchUserOrders = async (userId: string) => {
  const oid = toObjectId(userId);
  const orders = await getOrdersByUser(oid);
  return orders;
};

export const fetchOrder = async (userId: string, orderId: string) => {
  const order = await getOrderById(orderId);
  const orderUserId = order?.user?._id || order?.user;
  if (!order || toObjectId(orderUserId).toString() !== toObjectId(userId).toString()) {
    throw new AppError(404, 'Order not found');
  }
  return order;
};
