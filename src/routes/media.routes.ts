import { Router } from 'express';
import { uploadMedia, deleteMediaById } from '../controllers/media.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { uploadHandler } from '../middlewares/upload.middleware';

export const mediaRouter = Router();

mediaRouter.post('/', authMiddleware, uploadHandler('files'), uploadMedia);
mediaRouter.delete('/:id', authMiddleware, adminMiddleware, deleteMediaById);
