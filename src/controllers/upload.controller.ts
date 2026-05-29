import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utils/api-response.js';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      errorResponse(res, 'No file uploaded', 400);
      return;
    }

    successResponse(res, { url: `/uploads/${file.filename}` }, 'File uploaded', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
