import { Response } from 'express';
import { getProfile, updateProfile } from '../services/profile.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import { pick } from '../utils/pick';

const PROFILE_EDITABLE_FIELDS = ['name', 'phone', 'avatar'] as const;

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await getProfile(req.user!.id);
  successResponse(res, user, 'User profile retrieved');
});

export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const safeData = pick(req.body, PROFILE_EDITABLE_FIELDS);
  const user = await updateProfile(req.user!.id, safeData);
  successResponse(res, user, 'Profile updated');
});
