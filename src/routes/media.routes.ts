import { Router } from 'express';
import { uploadMedia, deleteMediaById } from '../controllers/media.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { adminMiddleware } from '../middlewares/admin.middleware.js';
import { uploadHandler } from '../middlewares/upload.middleware.js';

export const mediaRouter = Router();

mediaRouter.post('/', authMiddleware, uploadHandler('files'), uploadMedia);
mediaRouter.delete('/:id', authMiddleware, adminMiddleware, deleteMediaById);
