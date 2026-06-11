import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utils/api-response';
import { uploadImage } from '../helpers/image.helper';
import { MediaModel } from '../models/media.model';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      errorResponse(res, 'No file uploaded', 400);
      return;
    }

    const subDir = req.body.subDir || '';
    const result = await uploadImage(file.buffer, subDir);

    // Track the upload in the database to support listing and management
    await MediaModel.create({
      filename: result.publicId,
      url: result.url,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: (req as any).user?.id || null,
    });

    successResponse(res, { url: result.url }, 'File uploaded', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

/**
 * Fetch all images from the uploads directory or a specific subdirectory.
 * Example: GET /api/v1/uploads/list?subDir=about
 */
/**
 * Retrieves the list of uploaded files from the database.
 * Supports filtering by subdirectory (folder) prefix.
 */
export const listFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const subDir = req.query.subDir as string;
    const query: any = {};
    if (subDir) {
      query.filename = { $regex: new RegExp(`^${subDir}/`, 'i') };
    }
    const files = await MediaModel.find(query).sort({ createdAt: -1 }).lean();
    successResponse(res, files, 'Files retrieved successfully');
  } catch (error) {
    errorResponse(res, (error as Error).message, 500);
  }
};
