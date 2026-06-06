import { UserModel, IUser } from '../models/user.model.ts';

export const getUserById = async (id: string) => {
  return UserModel.findById(id).select('-password -refreshToken');
};

export const updateUserProfile = async (id: string, payload: Partial<IUser>) => {
  return UserModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).select('-password -refreshToken');
};
