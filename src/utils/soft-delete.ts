import { FilterQuery, UpdateQuery } from 'mongoose';

export const IS_DELETED_FILTER: FilterQuery<any> = { isDeleted: { $ne: true } };

export const getSoftDeleteFilter = (includeDeleted?: boolean): FilterQuery<any> => (includeDeleted === true ? {} : IS_DELETED_FILTER);

export const softDeleteUpdate = (deletedBy?: string): UpdateQuery<any> => ({
  $set: {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: deletedBy || 'System',
  },
});

export const restoreSoftDeleteUpdate: UpdateQuery<any> = {
  $set: {
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  },
};

export interface SoftDeleteDocument {
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}
