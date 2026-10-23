import { Router } from 'express';
import {
  getAllRolesAdmin,
  getPermissions,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/role.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { superAdminMiddleware } from '../middlewares/superadmin.middleware';

const router = Router();

router.use(authMiddleware, adminMiddleware);

// /admin/permissions must be registered before /admin/:id
router.get('/admin/permissions', getPermissions);
router.get('/admin', getAllRolesAdmin);
router.post('/admin', superAdminMiddleware, createRole);
router.put('/admin/:id', superAdminMiddleware, updateRole);
router.delete('/admin/:id', superAdminMiddleware, deleteRole);

export { router as rolesRouter };
