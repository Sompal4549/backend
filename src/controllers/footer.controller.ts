import { Request, Response } from 'express';
import { getFooter, updateFooter } from '../services/footer.service';
import { errorResponse, successResponse } from '../utils/api-response';

export const getFooterContent = async (_req: Request, res: Response): Promise<void> => {
  try {
    const footer = await getFooter();
    successResponse(res, footer);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const saveFooterContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const footer = await updateFooter(req.body);
    successResponse(res, footer);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
