import { createOrder, getOrdersByUser, getOrderById } from '../repositories/order.repository.js';
import { IOrder } from '../models/order.model.js';
import { CartModel } from '../models/cart.model.js';
import { UserModel } from '../models/user.model.js';
import { Types } from 'mongoose';

export const placeOrder = async (userId: string, payload: Partial<IOrder>) => {
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    const items = payload.items.map((item: any) => ({
      product: new Types.ObjectId(item.product),
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
    }));

    if (items.some((item) => !item.product || item.quantity < 1 || item.price < 0)) {
      const error = new Error('Invalid order items');
      (error as any).statusCode = 400;
      throw error;
    }

    const calculatedTotal = items.reduce((total, item) => total + item.quantity * item.price, 0);
    const orderPayload: Partial<IOrder> = {
      user: new Types.ObjectId(userId),
      items,
      totalAmount: Number(payload.totalAmount) > 0 ? Number(payload.totalAmount) : calculatedTotal,
      paymentStatus: payload.paymentStatus || 'pending',
      orderStatus: payload.orderStatus || 'pending',
      shippingAddress: payload.shippingAddress as any,
      trackingNumber: payload.trackingNumber,
    };

    const order = await createOrder(orderPayload);
    await UserModel.findByIdAndUpdate(userId, { $push: { orders: order._id } });
    return order;
  }

  const cart = await CartModel.findOne({ user: userId });
  if (!cart || cart.items.length === 0) {
    const error = new Error('Cart is empty');
    (error as any).statusCode = 400;
    throw error;
  }
  const orderPayload: Partial<IOrder> = {
    user: new Types.ObjectId(userId),
    items: cart.items,
    totalAmount: cart.totalAmount,
    paymentStatus: payload.paymentStatus || 'pending',
    orderStatus: payload.orderStatus || 'pending',
    shippingAddress: payload.shippingAddress as any,
    trackingNumber: payload.trackingNumber,
  };
  const order = await createOrder(orderPayload);
  await UserModel.findByIdAndUpdate(userId, { $push: { orders: order._id } });
  cart.items = [];
  cart.totalAmount = 0;
  await cart.save();
  return order;
};

export const fetchUserOrders = async (userId: string) => {
  return getOrdersByUser(userId);
};

export const fetchOrder = async (userId: string, orderId: string) => {
  const order = await getOrderById(orderId);
  if (!order || order.user.toString() !== userId) {
    const error = new Error('Order not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return order;
};
