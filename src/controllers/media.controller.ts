import { Request, Response } from 'express';
import { saveMedia, removeMedia } from '../services/media.service.ts';
import { successResponse, errorResponse } from '../utils/api-response.ts';
import { AuthRequest } from '../middlewares/auth.middleware.ts';

export const uploadMedia = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = (req as any).files as Express.Multer.File[];
    if (!files || files.length === 0) {
      errorResponse(res, 'No files uploaded', 400);
      return;
    }
    const uploaded = await Promise.all(
      files.map((file) => saveMedia(file.buffer, file.mimetype, file.size, req.user!.id))
    );
    successResponse(res, uploaded, 'Files uploaded successfully', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

export const deleteMediaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const media = await removeMedia(req.params.id);
    successResponse(res, media, 'Media item deleted');
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};
