import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { config } from '../config/app.config.js';
import { errorResponse } from '../utils/api-response.js';

const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
  limits: { fileSize: config.uploadMaxFileSizeBytes, files: config.uploadMaxFiles },
  fileFilter: (_req, file, cb) => {
    if (!config.uploadAllowedMimeTypes.includes(file.mimetype)) {
      cb(new Error(`Only these file types are allowed: ${config.uploadAllowedMimeTypes.join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

export const uploadHandler = (fieldName: string) => (req: Request, res: Response, next: NextFunction): void => {
  upload.array(fieldName, config.uploadMaxFiles)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    const message = error instanceof multer.MulterError ? error.message : (error as Error).message;
    errorResponse(res, message, 400);
  });
};
