import { Request, Response } from 'express';
import sharp from 'sharp';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { uploadMediaToCloudinary, listImagesFromCloudinary } from '../helpers/image.helper';
import { MediaModel } from '../models/media.model';

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;

  if (!file) {
    throw new AppError(400, 'No file uploaded');
  }

  const subDir = req.body.subDir || '';
  const mime = file.mimetype.toLowerCase();
  const isImage = mime.startsWith('image/');
  const isSvg = mime === 'image/svg+xml';

  let uploadBuffer = file.buffer;
  let finalMimetype = file.mimetype;

  // Convert raster images to webp with sharp; skip videos, audios, pdfs, svgs and docs
  if (isImage && !isSvg) {
    try {
      uploadBuffer = await sharp(file.buffer)
        .webp({ quality: 80 })
        .toBuffer();
      finalMimetype = 'image/webp';
    } catch {
      // If sharp cannot process, keep original buffer
      uploadBuffer = file.buffer;
      finalMimetype = file.mimetype;
    }
  }

  const result = await uploadMediaToCloudinary(
    uploadBuffer,
    subDir,
    finalMimetype,
    file.originalname
  );

  // Track upload in DB so it can be listed later with full metadata
  await MediaModel.create({
    filename: file.originalname || result.publicId,
    url: result.url,
    mimetype: finalMimetype,
    size: uploadBuffer.length,
    folder: subDir,
  });

  successResponse(
    res,
    {
      url: result.url,
      mimetype: finalMimetype,
      name: file.originalname || result.publicId,
      size: uploadBuffer.length,
      resourceType: result.resourceType,
    },
    'File uploaded',
    201
  );
});

/**
 * Lists uploaded files from Cloudinary and DB with mimetype and media type metadata.
 */
export const listFiles = asyncHandler(async (req: Request, res: Response) => {
  const subDir = String(req.query.subDir || '');
  const typeFilter = String(req.query.type || 'all').toLowerCase();
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.max(Number(req.query.limit) || 25, 1);

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  const filter: Record<string, unknown> = {};
  if (subDir) {
    filter.folder = subDir;
  }

  let merged: Array<{
    name: string;
    url: string;
    mimetype?: string;
    resourceType?: string;
    size?: number;
  }> = [];

  try {
    const cloudinaryFiles = await listImagesFromCloudinary(subDir);
    const media = await MediaModel.find(filter).sort({ createdAt: -1 }).limit(1000).lean();

    const dbMap = new Map(media.map((m) => [m.url, m]));
    const dbFiles = media.map((m) => ({
      name: m.filename.split('/').pop() || m.filename,
      url: m.url,
      mimetype: m.mimetype,
      size: m.size,
    }));

    const seen = new Set<string>();

    // Add DB files first (they have the original filename and correct mimetype)
    for (const file of dbFiles) {
      if (file.url && !seen.has(file.url)) {
        merged.push(file);
        seen.add(file.url);
      }
    }

    // Add Cloudinary files if not already tracked in DB
    for (const file of cloudinaryFiles) {
      if (file.url && !seen.has(file.url)) {
        const dbMatch = dbMap.get(file.url);
        merged.push({
          name: file.name,
          url: file.url,
          mimetype: dbMatch?.mimetype,
          resourceType: file.resourceType,
          size: dbMatch?.size,
        });
        seen.add(file.url);
      }
    }
  } catch {
    const media = await MediaModel.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
    merged = media.map((m) => ({
      name: m.filename.split('/').pop() || m.filename,
      url: m.url,
      mimetype: m.mimetype,
      size: m.size,
    }));
  }

  // Filter by media type if requested
  let filtered = merged;
  if (typeFilter && typeFilter !== 'all') {
    filtered = merged.filter((item) => {
      const mime = (item.mimetype || '').toLowerCase();
      const url = (item.url || '').toLowerCase();
      const resType = (item.resourceType || '').toLowerCase();

      if (typeFilter === 'image') {
        return mime.startsWith('image/') || resType === 'image' || /\.(jpg|jpeg|png|webp|svg|gif|avif)(\?.*)?$/i.test(url);
      }
      if (typeFilter === 'video') {
        return mime.startsWith('video/') || (resType === 'video' && !/\.(mp3|wav|ogg|aac|m4a)/i.test(url)) || /\.(mp4|webm|mov|avi|mkv|m4v)(\?.*)?$/i.test(url);
      }
      if (typeFilter === 'audio') {
        return mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|m4a|flac|wma)(\?.*)?$/i.test(url);
      }
      if (typeFilter === 'pdf') {
        return mime === 'application/pdf' || /\.pdf(\?.*)?$/i.test(url);
      }
      if (typeFilter === 'document') {
        return mime === 'application/pdf' || /\.(pdf|doc|docx|xls|xlsx|txt|csv|ppt|pptx)(\?.*)?$/i.test(url);
      }
      return true;
    });
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  successResponse(res, { files: paginated, total, page, limit }, 'Files listed');
});
