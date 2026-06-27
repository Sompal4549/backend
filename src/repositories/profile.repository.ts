import { UserModel, IUser } from '../models/user.model';

// Ye fields user khud update nahi kar sakta
const PROTECTED_FIELDS = ['password', 'refreshToken', 'role', 'emailVerified', 'phoneVerified'];

export const getUserById = async (id: string) => {
  return UserModel.findById(id).select('-password -refreshToken');
};

export const updateUserProfile = async (id: string, payload: Partial<IUser>) => {
  // Sensitive fields ko hata do payload se
  const safePayload = { ...payload } as any;
  PROTECTED_FIELDS.forEach((field) => delete safePayload[field]);

  if (Object.keys(safePayload).length === 0) {
    const error = new Error('No valid fields to update');
    (error as any).statusCode = 400;
    throw error;
  }

  return UserModel.findByIdAndUpdate(id, { $set: safePayload }, { new: true, runValidators: true }).select('-password -refreshToken');
};
