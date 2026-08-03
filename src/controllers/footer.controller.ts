import { Request, Response } from 'express';
import { getFooter, updateFooter } from '../services/footer.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';

export const getFooterContent = asyncHandler(async (_req: Request, res: Response) => {
  const footer = await getFooter();
  successResponse(res, footer);
});

export const saveFooterContent = asyncHandler(async (req: Request, res: Response) => {
  const footer = await updateFooter(req.body);
  successResponse(res, footer);
});
