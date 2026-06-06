import { createOrder, getOrdersByUser, getOrderById } from '../repositories/order.repository';
import { IOrder } from '../models/order.model';
import { CartModel } from '../models/cart.model';
import { UserModel } from '../models/user.model';
import { Types } from 'mongoose';

const toObjectId = (id: any): Types.ObjectId => {
  if (id instanceof Types.ObjectId) return id;
  const idStr = String(id).trim();
  if (/^\d+$/.test(idStr) && idStr.length < 24) {
    const pad = '600000000000000000000000';
    return new Types.ObjectId(pad.substring(0, 24 - idStr.length) + idStr);
  }
  return new Types.ObjectId(idStr);
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
    await UserModel.findByIdAndUpdate(toObjectId(userId), { $push: { orders: order._id } });
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
  await UserModel.findByIdAndUpdate(toObjectId(userId), { $push: { orders: order._id } });
  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();
  return order;
};

export const fetchUserOrders = async (userId: string) => {
  return getOrdersByUser(toObjectId(userId).toString());
};

export const fetchOrder = async (userId: string, orderId: string) => {
  const order = await getOrderById(orderId);
  if (!order || toObjectId(order.user).toString() !== toObjectId(userId).toString()) {
    const error = new Error('Order not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return order;
};
