import { UserModel, IUser, UserDocument } from '../models/user.model.ts';
import { Types } from 'mongoose';

export const findUserByEmail = async (email: string): Promise<UserDocument | null> => {
  return UserModel.findOne({ email }).select('+password +refreshToken').exec() as Promise<UserDocument | null>;
};

export const findUserByPhone = async (phone: string): Promise<UserDocument | null> => {
  return UserModel.findOne({ phone }).select('+password +refreshToken').exec() as Promise<UserDocument | null>;
};

export const findUserById = async (id: string | Types.ObjectId): Promise<UserDocument | null> => {
  return UserModel.findById(id).select('+password +refreshToken').exec() as Promise<UserDocument | null>;
};

export const createUser = async (payload: Partial<IUser>): Promise<UserDocument> => {
  return UserModel.create(payload);
};

export const updateUserRefreshToken = async (userId: string, token: string | null): Promise<UserDocument | null> => {
  return UserModel.findByIdAndUpdate(userId, { refreshToken: token }, { new: true, runValidators: true }).select('+refreshToken').exec() as Promise<UserDocument | null>;
};

export const markUserEmailVerified = async (email: string): Promise<UserDocument | null> => {
  return UserModel.findOneAndUpdate({ email }, { emailVerified: true }, { new: true }).exec() as Promise<UserDocument | null>;
};

export const markUserPhoneVerified = async (phone: string): Promise<UserDocument | null> => {
  return UserModel.findOneAndUpdate({ phone }, { phoneVerified: true }, { new: true }).exec() as Promise<UserDocument | null>;
};

export const getAllUsers = async () => UserModel.find().select('-password -refreshToken');
