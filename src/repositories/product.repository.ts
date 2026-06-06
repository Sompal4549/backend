import { ProductModel, IProduct } from '../models/product.model.js';
import { FilterQuery, SortOrder, Types } from 'mongoose';

type ProductSort = string | { [key: string]: SortOrder | { $meta: any } } | [string, SortOrder][];

export const createProduct = async (payload: Partial<IProduct>): Promise<IProduct> => {
  return ProductModel.create(payload);
};

export const getProductById = async (id: string) => {
  return ProductModel.findById(id).populate('category subCategory reviews');
};

export const getActiveProductById = async (id: string) => {
  return ProductModel.findOne({ _id: id, isActive: true }).populate('category subCategory reviews');
};

export const getActiveProductByIdOrSlug = async (idOrSlug: string) => {
  const query = Types.ObjectId.isValid(idOrSlug)
    ? { _id: idOrSlug, isActive: true }
    : { slug: idOrSlug, isActive: true };
  return ProductModel.findOne(query).populate('category subCategory reviews');
};

export const updateProductById = async (id: string, payload: Partial<IProduct>) => {
  return ProductModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
};

export const deleteProductById = async (id: string) => {
  return ProductModel.findByIdAndDelete(id);
};

export const getProducts = async (query: FilterQuery<IProduct>, skip: number, limit: number, sort: ProductSort) => {
  return ProductModel.find(query).populate('category').skip(skip).limit(limit).sort(sort);
};

export const countProducts = async (query: FilterQuery<IProduct>) => {
  return ProductModel.countDocuments(query);
};

export const searchProducts = async (search: string, query: FilterQuery<IProduct>, skip: number, limit: number, sort: ProductSort) => {
  const textQuery = search ? { $text: { $search: search } } : {};
  return ProductModel.find({ ...query, ...textQuery }).skip(skip).limit(limit).sort(sort);
};
