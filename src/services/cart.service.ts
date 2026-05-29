import { getCartByUser, createCartForUser, upsertCart } from '../repositories/cart.repository.js';
import { ProductModel } from '../models/product.model.js';

export const fetchCart = async (userId: string) => {
  const cart = await getCartByUser(userId);
  if (cart) return cart;
  return createCartForUser(userId);
};

const calculateTotal = (items: { product: any; quantity: number; price: number }[]) => {
  return items.reduce((total, item) => total + item.quantity * item.price, 0);
};

export const addItemToCart = async (userId: string, productId: string, quantity = 1) => {
  const product = await ProductModel.findById(productId).lean();
  if (!product) {
    const error = new Error('Product not found');
    (error as any).statusCode = 404;
    throw error;
  }
  const cart = (await fetchCart(userId)) as any;
  const existing = cart.items.find((item: any) => item.product.toString() === productId);
  if (existing) {
    existing.quantity += quantity;
    existing.price = product.price;
  } else {
    cart.items.push({ product: productId, quantity, price: product.price });
  }
  cart.totalAmount = calculateTotal(cart.items);
  return upsertCart(userId, cart);
};

export const updateCartItem = async (userId: string, productId: string, quantity: number) => {
  const cart = (await fetchCart(userId)) as any;
  const item = cart.items.find((item: any) => item.product.toString() === productId);
  if (!item) {
    const error = new Error('Cart item not found');
    (error as any).statusCode = 404;
    throw error;
  }
  item.quantity = quantity;
  cart.totalAmount = calculateTotal(cart.items);
  return upsertCart(userId, cart);
};

export const removeCartItem = async (userId: string, productId: string) => {
  const cart = (await fetchCart(userId)) as any;
  cart.items = cart.items.filter((item: any) => item.product.toString() !== productId);
  cart.totalAmount = calculateTotal(cart.items);
  return upsertCart(userId, cart);
};
