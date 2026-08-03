import { Request, Response } from 'express';
import sharp from 'sharp';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { uploadImage } from '../helpers/image.helper';

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    throw new AppError(400, 'No file uploaded');
  }

  const subDir = req.body.subDir || '';

  // Convert image to webp
  const webpBuffer = await sharp(file.buffer)
    .webp({ quality: 80 })
    .toBuffer();

  const result = await uploadImage(webpBuffer, subDir);

  successResponse(
    res,
    { url: result.url },
    'File uploaded',
    201
  );
});

/**
 * Listing files from Cloudinary is not supported via simple filesystem calls.
 * For a production app, it's recommended to store uploaded image metadata in your database.
 */
export const listFiles = asyncHandler(async (_req: Request, _res: Response) => {
  throw new AppError(501, 'Listing files is not supported with Cloudinary integration without DB tracking.');
});
