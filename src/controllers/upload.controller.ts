import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utils/api-response';
import { optimizeImage } from '../helpers/image.helper';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      errorResponse(res, 'No file uploaded', 400);
      return;
    }

    const filename = await optimizeImage(file.buffer, file.originalname);
    successResponse(res, { url: `/uploads/${filename}` }, 'File uploaded', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
