import { Router } from 'express';
import {
  getDropdowns,
  getDropdown,
  getAdminLists,
  getAdminOptions,
  createOption,
  updateOption,
  deleteOption,
  reorderOptions,
} from '../controllers/dropdowns.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

export const dropdownsRouter = Router();

// Admin routes first so "/admin" is never read as a list key
dropdownsRouter.get('/admin/lists', authMiddleware, adminMiddleware, getAdminLists);
dropdownsRouter.put('/admin/lists/:list/order', authMiddleware, adminMiddleware, reorderOptions);
dropdownsRouter.get('/admin/options', authMiddleware, adminMiddleware, getAdminOptions);
dropdownsRouter.post('/admin/options', authMiddleware, adminMiddleware, createOption);
dropdownsRouter.patch('/admin/options/:id', authMiddleware, adminMiddleware, updateOption);
dropdownsRouter.delete('/admin/options/:id', authMiddleware, adminMiddleware, deleteOption);

// Public: what the website forms read
dropdownsRouter.get('/', getDropdowns);
dropdownsRouter.get('/:list', getDropdown);
