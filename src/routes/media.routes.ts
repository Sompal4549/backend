import { Router } from 'express';
import { uploadMedia, deleteMediaById } from '../controllers/media.controller.ts';
import { authMiddleware } from '../middlewares/auth.middleware.ts';
import { adminMiddleware } from '../middlewares/admin.middleware.ts';
import { uploadHandler } from '../middlewares/upload.middleware.ts';

export const mediaRouter = Router();

mediaRouter.post('/', authMiddleware, uploadHandler('files'), uploadMedia);
mediaRouter.delete('/:id', authMiddleware, adminMiddleware, deleteMediaById);
