import { TransactionModel, ITransaction } from '../models/transaction.model';

export const createTransaction = async (payload: Partial<ITransaction>): Promise<ITransaction> => {
  return TransactionModel.create(payload);
};

export const findTransactionByRazorpayOrderId = async (razorpayOrderId: string) => {
  return TransactionModel.findOne({ razorpayOrderId });
};

export const findTransactionsByOrder = async (orderId: string) => {
  return TransactionModel.find({ order: orderId }).sort({ createdAt: -1 });
};

export const findTransactionsByUser = async (userId: string) => {
  return TransactionModel.find({ user: userId }).sort({ createdAt: -1 });
};

export const updateTransactionById = async (id: string, payload: Partial<ITransaction>) => {
  return TransactionModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
};
