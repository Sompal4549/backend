import { AppError } from '../utils/app-error';
import { UserModel, IUser } from '../models/user.model';
import { pick } from '../utils/pick';

const PROFILE_ALLOWED_FIELDS = ['name', 'phone', 'avatar'] as const;

export const getUserById = async (id: string) => {
  return UserModel.findById(id).select('-password -refreshToken');
};

export const updateUserProfile = async (id: string, payload: Partial<IUser>) => {
  const safePayload = pick(payload, PROFILE_ALLOWED_FIELDS);

  if (Object.keys(safePayload).length === 0) {
    throw new AppError(400, 'No valid fields to update');
  }

  return UserModel.findByIdAndUpdate(id, { $set: safePayload }, { new: true, runValidators: true }).select('-password -refreshToken');
};
