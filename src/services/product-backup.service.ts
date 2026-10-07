import { ProductBackupModel, IProductBackup } from '../models/product-backup.model';
import { ProductModel } from '../models/product.model';
import { Types } from 'mongoose';
import { AppError } from '../utils/app-error';

const MAX_BACKUPS_PER_PRODUCT = 20;

/**
 * Create a backup snapshot of the current state of a product.
 * Called automatically before every update, and also available manually.
 */
export const createProductBackup = async (
  productId: string,
  backedUpBy?: string,
  note?: string
): Promise<IProductBackup> => {
  const product = await ProductModel.findById(productId).lean();
  if (!product) {
    throw new AppError(404, 'Product not found — cannot create backup');
  }

  const backup = await ProductBackupModel.create({
    productId: new Types.ObjectId(productId),
    snapshot: product,
    backedUpAt: new Date(),
    backedUpBy: backedUpBy ? new Types.ObjectId(backedUpBy) : undefined,
    note: note || 'auto',
  });

  // Prune old backups: keep only the latest MAX_BACKUPS_PER_PRODUCT
  const allBackups = await ProductBackupModel.find({ productId })
    .sort({ backedUpAt: -1 })
    .select('_id')
    .lean();

  if (allBackups.length > MAX_BACKUPS_PER_PRODUCT) {
    const toDelete = allBackups.slice(MAX_BACKUPS_PER_PRODUCT).map((b) => b._id);
    await ProductBackupModel.deleteMany({ _id: { $in: toDelete } });
  }

  return backup;
};

/**
 * List all backups for a given product, newest first.
 */
export const listProductBackups = async (productId: string) => {
  return ProductBackupModel.find({ productId })
    .sort({ backedUpAt: -1 })
    .select('-snapshot') // don't send full snapshot in list — too heavy
    .lean();
};

/**
 * Get a single backup (with full snapshot).
 */
export const getProductBackup = async (backupId: string) => {
  const backup = await ProductBackupModel.findById(backupId).lean();
  if (!backup) throw new AppError(404, 'Backup not found');
  return backup;
};

/**
 * Restore a product to a previously backed-up state.
 * Also creates a backup of the current state before restoring.
 */
export const restoreProductFromBackup = async (
  backupId: string,
  restoredBy?: string
) => {
  const backup = await ProductBackupModel.findById(backupId).lean();
  if (!backup) throw new AppError(404, 'Backup not found');

  const productId = backup.productId.toString();

  // Save current state before overwriting
  await createProductBackup(productId, restoredBy, `pre-restore (restoring to ${backupId})`);

  // Strip Mongoose-internal fields from snapshot before restoring
  const { _id, __v, createdAt, updatedAt, ...restoredData } = backup.snapshot as any;

  const restored = await ProductModel.findByIdAndUpdate(
    productId,
    { $set: restoredData },
    { new: true, runValidators: false }
  );

  if (!restored) throw new AppError(404, 'Product not found — cannot restore');
  return restored;
};

/**
 * Delete a specific backup.
 */
export const deleteProductBackup = async (backupId: string) => {
  const result = await ProductBackupModel.findByIdAndDelete(backupId);
  if (!result) throw new AppError(404, 'Backup not found');
  return result;
};

/**
 * Delete all backups for a product.
 */
export const deleteAllBackupsForProduct = async (productId: string) => {
  return ProductBackupModel.deleteMany({ productId });
};
