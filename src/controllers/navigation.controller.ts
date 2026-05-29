import { Request, Response } from 'express';
import { getNavigation, updateNavigation } from '../services/navigation.service.js';
import { errorResponse, successResponse } from '../utils/api-response.js';

export const getNavigationContent = async (_req: Request, res: Response): Promise<void> => {
  try {
    const navigation = await getNavigation();
    successResponse(res, navigation);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const saveNavigationContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const navigation = await updateNavigation(req.body);
    successResponse(res, navigation);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
