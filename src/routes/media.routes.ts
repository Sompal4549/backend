import { Router } from 'express';
import {
  uploadMedia,
  deleteMediaById,
  uploadSingleMedia,
  listMedia,
} from '../controllers/media.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { uploadHandler } from '../middlewares/upload.middleware';

export const mediaRouter = Router();

// Single file upload for CMS PageContentEditor (field name: 'file')
mediaRouter.post('/upload', authMiddleware, uploadHandler('file'), uploadSingleMedia);

// Multiple file upload (existing - field name: 'files')
mediaRouter.post('/', authMiddleware, uploadHandler('files'), uploadMedia);

// Gallery listing
mediaRouter.get('/', authMiddleware, adminMiddleware, listMedia);

// Delete media
mediaRouter.delete('/:id', authMiddleware, adminMiddleware, deleteMediaById);
