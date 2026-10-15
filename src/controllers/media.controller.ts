import { Request, Response } from 'express';
import { saveMedia, removeMedia } from '../services/media.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/app-error';
import { MediaModel } from '../models/media.model';

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

export const uploadSingleMedia = asyncHandler(async (req: AuthRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File;
  if (!file) {
    throw new AppError(400, 'No file uploaded');
  }
  const media = await saveMedia(file.buffer, file.mimetype, file.size, req.user!.id);
  successResponse(res, media, 'File uploaded successfully', 201);
});

export const listMedia = asyncHandler(async (_req: Request, res: Response) => {
  const media = await MediaModel.find().sort({ createdAt: -1 }).limit(20);
  successResponse(res, media, 'Media gallery listed');
});

export const deleteMediaById = asyncHandler(async (req: Request, res: Response) => {
  const media = await removeMedia(req.params.id);
  successResponse(res, media, 'Media item deleted');
});
