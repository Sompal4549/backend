import { Router } from 'express';
import multer from 'multer';
import { uploadFile, listFiles } from '../controllers/upload.controller';
import { config } from '../config/app.config';
import { errorResponse } from '../utils/api-response';

export const uploadRouter = Router();

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploadMaxFileSizeBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    const isAllowed =
      mime.startsWith('image/') ||
      mime.startsWith('video/') ||
      mime.startsWith('audio/') ||
      mime === 'application/pdf' ||
      config.uploadAllowedMimeTypes.includes(mime);

    if (!isAllowed) {
      cb(new Error(`File type ${file.mimetype} is not supported. Allowed: Images, Videos, Audio, PDFs, and Documents.`));
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

uploadRouter.get('/list', listFiles);
