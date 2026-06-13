import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utils/api-response';
import { uploadImage } from '../helpers/image.helper';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      errorResponse(res, 'No file uploaded', 400);
      return;
    }

    const subDir = req.body.subDir || '';
    const result = await uploadImage(file.buffer, subDir);
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
 * Listing files from Cloudinary is not supported via simple filesystem calls.
 * It requires using the Cloudinary Search API or Admin API.
 * For a production app, it's recommended to store uploaded image metadata in your database.
 */
export const listFiles = async (_req: Request, res: Response): Promise<void> => {
  errorResponse(res, 'Listing files is not supported with Cloudinary integration without DB tracking.', 501);
};
