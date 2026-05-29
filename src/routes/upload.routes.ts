import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { uploadFile } from '../controllers/upload.controller.js';
import { config } from '../config/app.config.js';
import { errorResponse } from '../utils/api-response.js';

export const uploadRouter = Router();

const uploadDirectory = path.resolve(process.cwd(), config.uploadDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadDirectory, { recursive: true });
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    cb(null, `${Date.now()}-${baseName || 'upload'}${ext.toLowerCase()}`);
  },
});

const uploader = multer({
  storage,
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
