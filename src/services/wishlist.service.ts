import { addProductToWishlist, getWishlistByUser, removeProductFromWishlist } from '../repositories/wishlist.repository';

export const fetchWishlist = async (userId: string) => {
  const wishlist = await getWishlistByUser(userId);
  return wishlist || { user: userId, products: [] };
};

export const addWishlistItem = async (userId: string, productId: string) => {
  const wishlist = await addProductToWishlist(userId, productId);
  if (!wishlist) {
    throw new Error('Unable to add wishlist item');
  }
  return wishlist;
};

export const deleteWishlistItem = async (userId: string, productId: string) => {
  const wishlist = await removeProductFromWishlist(userId, productId);
  if (!wishlist) {
    throw new Error('Unable to remove wishlist item');
  }
  return wishlist;
};
