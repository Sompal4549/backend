import { getUserById, updateUserProfile } from '../repositories/profile.repository.js';

export const getProfile = async (userId: string) => {
  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    (error as any).statusCode = 404;
    throw error;
  }
  return user;
};

export const updateProfile = async (userId: string, payload: Partial<any>) => {
  return updateUserProfile(userId, payload);
};
