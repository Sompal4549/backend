import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../utils/api-response';
import { optimizeImage } from '../helpers/image.helper';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/app.config';

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      errorResponse(res, 'No file uploaded', 400);
      return;
    }

    const subDir = req.body.subDir || '';
    const filename = await optimizeImage(file.buffer, file.originalname, subDir);
    successResponse(res, { url: `/uploads/${filename}` }, 'File uploaded', 201);
  } catch (error) {
    errorResponse(res, (error as Error).message, (error as any).statusCode || 500);
  }
};

/**
 * Fetch all images from the uploads directory or a specific subdirectory.
 * Example: GET /api/v1/uploads/list?subDir=about
 */
export const listFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const subDir = (req.query.subDir as string) || '';
    
    // Basic security: prevent directory traversal
    const safeSubDir = subDir.replace(/\.\.[/\\]/g, '');
    const directoryPath = path.resolve(process.cwd(), config.uploadDir, safeSubDir);

    // Check if directory exists
    await fs.access(directoryPath);
    
    const files = await fs.readdir(directoryPath, { withFileTypes: true });

    const images = files
      .filter(file => file.isFile() && /\.(webp|jpg|jpeg|png|gif|svg)$/i.test(file.name))
      .map(file => ({
        name: file.name,
        url: `/uploads/${subDir ? subDir + '/' : ''}${file.name}`,
      }));

    successResponse(res, images, 'Images fetched successfully');
  } catch (error) {
    errorResponse(res, 'Directory not found or could not be read', 404);
  }
};
