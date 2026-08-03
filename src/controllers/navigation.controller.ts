import { Request, Response } from 'express';
import { getNavigation, updateNavigation } from '../services/navigation.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';

export const getNavigationContent = asyncHandler(async (_req: Request, res: Response) => {
  const navigation = await getNavigation();
  successResponse(res, navigation);
});

export const saveNavigationContent = asyncHandler(async (req: Request, res: Response) => {
  const navigation = await updateNavigation(req.body);
  successResponse(res, navigation);
});
