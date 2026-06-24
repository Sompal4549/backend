import { ProductModel, IProduct } from '../models/product.model';
import { FilterQuery, SortOrder, Types } from 'mongoose';

type ProductSort = string | { [key: string]: SortOrder | { $meta: any } } | [string, SortOrder][];

export const createProduct = async (payload: Partial<IProduct>): Promise<IProduct> => {
  return ProductModel.create(payload);
};

export const getProductById = async (id: string) => {
  return ProductModel.findById(id).populate('category reviews');
};

export const getActiveProductById = async (id: string) => {
  return ProductModel.findOne({ _id: id, isActive: true }).populate('category reviews');
};

export const getActiveProductByIdOrSlug = async (idOrSlug: string) => {
  try {
    const query = Types.ObjectId.isValid(idOrSlug)
      ? { _id: idOrSlug, isActive: true }
      : { slug: idOrSlug, isActive: true };

    const product = await ProductModel.findOne(query)
      .populate('category reviews');

    console.log(product);

    return product;
  } catch (err) {
    console.error(err);
    throw err;
  }
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
