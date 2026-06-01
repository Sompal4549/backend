import { Router } from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/upload.controller';
import { config } from '../config/app.config';
import { errorResponse } from '../utils/api-response';

export const uploadRouter = Router();

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploadMaxFileSizeBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!config.uploadAllowedMimeTypes.includes(file.mimetype)) {
      cb(new Error(`Only these file types are allowed: ${config.uploadAllowedMimeTypes.join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

uploadRouter.post('/', (req, res, next) => {
  uploader.single('file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const message = error instanceof multer.MulterError ? error.message : (error as Error).message;
    errorResponse(res, message, 400);
  });
}, uploadFile);
