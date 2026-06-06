import { createOrder, getOrdersByUser, getOrderById } from '../repositories/order.repository';
import { IOrder } from '../models/order.model';
import { CartModel } from '../models/cart.model';
import { UserModel } from '../models/user.model';
import { Types } from 'mongoose';
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

export const placeOrder = async (userId: string, payload: Partial<IOrder>) => {
  const shippingAddress = payload.shippingAddress;
  if (!shippingAddress) {
    const error = new Error('Shipping address is required');
    (error as any).statusCode = 400;
    throw error;
  }

  if (Array.isArray(payload.items) && payload.items.length > 0) {
    const items = payload.items.map((item: any) => ({
      product: item.product ? toObjectId(item.product) : null,
      name: item.name,
      quantity: Number(item.quantity) || 0,
      price: Number(item.price),
    }));

    if (items.some((item) => !item.product || item.quantity < 1 || item.price < 0)) {
      const error = new Error('Invalid order items');
      (error as any).statusCode = 400;
      throw error;
    }

    const calculatedTotal = items.reduce((total, item) => total + item.quantity * item.price, 0);
    const orderPayload: Partial<IOrder> = {
      user: toObjectId(userId),
      items: items as any,
      totalAmount: payload.totalAmount && Number(payload.totalAmount) > 0 ? Number(payload.totalAmount) : calculatedTotal,
      paymentStatus: payload.paymentStatus || 'pending',
      orderStatus: payload.orderStatus || 'pending',
      shippingAddress: shippingAddress as any,
      trackingNumber: payload.trackingNumber,
    };

    const order = await createOrder(orderPayload);
    const user = await UserModel.findByIdAndUpdate(
      toObjectId(userId),
      { $addToSet: { orders: order._id } },
      { new: true, runValidators: true }
    );
    if (!user) {
      const error = new Error('User not found while updating order history');
      (error as any).statusCode = 500;
      throw error;
    }

    // Use ONLY the phone number provided in the shipping address at checkout
    const recipientPhone = normalizePhone((shippingAddress as any)?.phone);

    if (recipientPhone) {
      console.log(`Sending Order Received WhatsApp to: ${recipientPhone} (Source: Checkout)`);
      const message = `*Order Received!*\n\nHello ${user?.name || 'Customer'},\n\nWe have received your order #${order._id} for ₹${order.totalAmount}. Status: ${order.paymentStatus}.\n\nThank you for choosing Ensis!`;
      await sendWhatsAppMessage(recipientPhone, message, user?.name || null);
    } else {
      console.warn(`WhatsApp notification skipped for Order #${order._id}: No phone number found.`);
    }
    
    return order;
  }

  const cart = await CartModel.findOne({ user: toObjectId(userId) });
  if (!cart || cart.items.length === 0) {
    const error = new Error('Cart is empty');
    (error as any).statusCode = 400;
    throw error;
  }

  const items = cart.items.map((item: any) => ({
    product: toObjectId(item.product),
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }));

  const orderPayload: Partial<IOrder> = {
    user: toObjectId(userId),
    items: items as any,
    totalAmount: cart.totalAmount,
    paymentStatus: payload.paymentStatus || 'pending',
    orderStatus: payload.orderStatus || 'pending',
    shippingAddress: shippingAddress as any,
    trackingNumber: payload.trackingNumber,
  };
  const order = await createOrder(orderPayload);
  const user = await UserModel.findByIdAndUpdate(
    toObjectId(userId),
    { $addToSet: { orders: order._id } },
    { new: true, runValidators: true }
  );
  if (!user) {
    const error = new Error('User not found while updating order history');
    (error as any).statusCode = 500;
    throw error;
  }

  // Use ONLY the phone number provided in the shipping address at checkout
  const recipientPhone = normalizePhone((shippingAddress as any)?.phone);

  if (recipientPhone) {
    console.log(`Sending Order Received WhatsApp to: ${recipientPhone} (Source: Cart Checkout)`);
    const message = `*Order Received!*\n\nHello ${user?.name || 'Customer'},\n\nYour order #${order._id} for ₹${order.totalAmount} has been received via your cart.\n\nThank you!`;
    await sendWhatsAppMessage(recipientPhone, message, user?.name || null);
  } else {
    console.warn(`WhatsApp notification skipped for Order #${order._id}: No phone number found.`);
  }

  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();
  return order;
};

export const fetchUserOrders = async (userId: string) => {
  const oid = toObjectId(userId);
    const orders = await getOrdersByUser(oid);
    console.info('fetchUserOrders: userId=', userId, 'objectId=', oid.toString(), 'ordersCount=', Array.isArray(orders) ? orders.length : 0);
  return orders;
};

export const fetchOrder = async (userId: string, orderId: string) => {
  const order = await getOrderById(orderId);
  const orderUserId = order?.user?._id || order?.user;
  if (!order || toObjectId(orderUserId).toString() !== toObjectId(userId).toString()) {
    const error = new Error('Order not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return order;
};
