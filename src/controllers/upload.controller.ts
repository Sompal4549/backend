import { Request, Response } from 'express';
import sharp from 'sharp';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { uploadImage, listImagesFromCloudinary } from '../helpers/image.helper';
import { MediaModel } from '../models/media.model';

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

  // Track upload in DB so it can be listed later
  await MediaModel.create({
    filename: result.publicId,
    url: result.url,
    mimetype: 'image/webp',
    size: webpBuffer.length,
    folder: subDir,
  });

  successResponse(
    res,
    { url: result.url },
    'File uploaded',
    201
  );
});

/**
 * Lists uploaded files from the DB (each upload is tracked in the Media collection).
 */
export const listFiles = asyncHandler(async (req: Request, res: Response) => {
  const subDir = String(req.query.subDir || '');
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 25, 1);

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const cloudinaryFiles = await listImagesFromCloudinary(subDir);

    const filter: Record<string, unknown> = {};
    if (subDir) {
      filter.folder = subDir;
    }
    const media = await MediaModel.find(filter).sort({ createdAt: -1 }).limit(500).lean();

    const dbFiles = media.map((m) => ({
      name: m.filename.split('/').pop() || m.filename,
      url: m.url,
    }));

    const seen = new Set(cloudinaryFiles.map((f) => f.url));
    const merged = [...cloudinaryFiles];
    for (const file of dbFiles) {
      if (file.url && !seen.has(file.url)) {
        merged.push(file);
        seen.add(file.url);
      }
    }

    const total = merged.length;
    const start = (page - 1) * limit;
    const paginated = merged.slice(start, start + limit);

    successResponse(res, { files: paginated, total, page, limit }, 'Files listed');
  } catch (error) {
    const filter: Record<string, unknown> = {};
    if (subDir) {
      filter.folder = subDir;
    }
    const media = await MediaModel.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    const dbFiles = media.map((m) => ({
      name: m.filename.split('/').pop() || m.filename,
      url: m.url,
    }));

    const total = dbFiles.length;
    const start = (page - 1) * limit;
    const paginated = dbFiles.slice(start, start + limit);

    successResponse(res, { files: paginated, total, page, limit }, 'Files listed (fallback: DB only)');
  }
});
