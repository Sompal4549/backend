import { AppError } from '../utils/app-error';
import { getUserById, updateUserProfile } from '../repositories/profile.repository';

export const getProfile = async (userId: string) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
};

export const updateProfile = async (userId: string, payload: Partial<any>) => {
  return updateUserProfile(userId, payload);
};
