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

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    // Cloudinary se direct list karo — purani uploads (jo DB me track nahi hui)
    // bhi yahan mil jayengi. DB record kisika miss ho to bhi image dikhegi.
    const cloudinaryFiles = await listImagesFromCloudinary(subDir);

    // DB me bhi tracking rakhte hain (delete karne ke liye publicId work kare)
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

    successResponse(res, merged, 'Files listed');
  } catch (error) {
    // Cloudinary list fail ho jaye to at least DB records toh dikhao
    const filter: Record<string, unknown> = {};
    if (subDir) {
      filter.folder = subDir;
    }
    const media = await MediaModel.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    const dbFiles = media.map((m) => ({
      name: m.filename.split('/').pop() || m.filename,
      url: m.url,
    }));
    successResponse(res, dbFiles, 'Files listed (fallback: DB only)');
  }
});
