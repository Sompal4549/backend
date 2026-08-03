import { Request, Response } from 'express';
import { saveMedia, removeMedia } from '../services/media.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/app-error';

export const uploadMedia = asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = (req as any).files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new AppError(400, 'No files uploaded');
  }
  const uploaded = await Promise.all(
    files.map((file) => saveMedia(file.buffer, file.mimetype, file.size, req.user!.id))
  );
  successResponse(res, uploaded, 'Files uploaded successfully', 201);
});

export const deleteMediaById = asyncHandler(async (req: Request, res: Response) => {
  const media = await removeMedia(req.params.id);
  successResponse(res, media, 'Media item deleted');
});
