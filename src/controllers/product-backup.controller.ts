import { Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  createProductBackup,
  listProductBackups,
  getProductBackup,
  restoreProductFromBackup,
  deleteProductBackup,
  deleteAllBackupsForProduct,
} from '../services/product-backup.service';

/** GET /products/:id/backups — list all backups for a product */
export const getBackupsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const backups = await listProductBackups(req.params.id);
  successResponse(res, backups, 'Backups retrieved');
});

/** POST /products/:id/backups — manually create a backup */
export const createBackupHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  const backup = await createProductBackup(req.params.id, userId, req.body.note || 'manual');
  successResponse(res, backup, 'Backup created', 201);
});

/** GET /products/backups/:backupId — get a single backup with full snapshot */
export const getBackupHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const backup = await getProductBackup(req.params.backupId);
  successResponse(res, backup, 'Backup retrieved');
});

/** POST /products/backups/:backupId/restore — restore product to this backup */
export const restoreBackupHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)?._id?.toString();
  const restored = await restoreProductFromBackup(req.params.backupId, userId);
  successResponse(res, restored, 'Product restored from backup');
});

/** DELETE /products/backups/:backupId — delete a single backup */
export const deleteBackupHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  await deleteProductBackup(req.params.backupId);
  successResponse(res, null, 'Backup deleted');
});

/** DELETE /products/:id/backups — delete ALL backups for a product */
export const deleteAllBackupsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  await deleteAllBackupsForProduct(req.params.id);
  successResponse(res, null, 'All backups deleted for product');
});
