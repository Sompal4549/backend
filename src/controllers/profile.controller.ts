import { Response } from 'express';
import { getProfile, updateProfile } from '../services/profile.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await getProfile(req.user!.id);
  successResponse(res, user, 'User profile retrieved');
});

export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await updateProfile(req.user!.id, req.body);
  successResponse(res, user, 'Profile updated');
});
