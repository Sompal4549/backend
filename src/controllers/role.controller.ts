import { Request, Response } from 'express';
import { RoleModel, IRole, ROLE_STATUSES } from '../models/role.model';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { ROLE } from '../constants/roles.constants';
import {
  ALL_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  SYSTEM_ROLES,
  SYSTEM_ROLE_IDS,
} from '../constants/permissions.constants';

const RESERVED_SLUGS = Object.values(ROLE).map((r) => r.toLowerCase());

// Built-in roles always exist; insert them on first read instead of requiring a seed
const ensureSystemRoles = async () => {
  await RoleModel.bulkWrite(
    SYSTEM_ROLES.map((r) => ({
      updateOne: {
        filter: { _id: r._id },
        update: {
          $setOnInsert: { name: r.name, description: r.description },
          $set: { slug: r.slug, isSystem: true, status: 'ACTIVE', permissionIds: [ALL_PERMISSIONS] },
        },
        upsert: true,
      },
    }))
  );
};

const toResponse = (role: IRole) => {
  const permissionIds = role.permissionIds || [];
  const permissions = permissionIds.includes(ALL_PERMISSIONS)
    ? PERMISSION_CATALOG
    : PERMISSION_CATALOG.filter((p) => permissionIds.includes(p.key));
  return {
    _id: role._id,
    name: role.name,
    slug: role.slug,
    description: role.description || '',
    permissionIds,
    permissions,
    isSystem: Boolean(role.isSystem),
    status: role.status,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
};

const cleanPermissionIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) throw new AppError(400, 'permissionIds must be an array');
  const ids = Array.from(new Set(value.map((v) => String(v))));
  const unknown = ids.filter((id) => !PERMISSION_KEYS.has(id));
  if (unknown.length) throw new AppError(400, `Unknown permission(s): ${unknown.join(', ')}`);
  return ids;
};

export const getPermissions = asyncHandler(async (_req: Request, res: Response) => {
  successResponse(res, PERMISSION_CATALOG, 'Permissions retrieved');
});

export const getAllRolesAdmin = asyncHandler(async (_req: Request, res: Response) => {
  await ensureSystemRoles();
  const roles = await RoleModel.find().sort({ isSystem: -1, createdAt: 1 }).lean<IRole[]>();
  successResponse(res, roles.map(toResponse), 'Roles retrieved');
});

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const name = String(req.body.name || '').trim();
  const slug = String(req.body.slug || '').trim();
  if (!name) throw new AppError(400, 'Role name is required');
  if (!slug) throw new AppError(400, 'Role slug is required');
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) {
    throw new AppError(400, 'Role slug may only contain letters, numbers, "_" and "-"');
  }
  if (RESERVED_SLUGS.includes(slug.toLowerCase()) || slug.toLowerCase() === 'super_admin') {
    throw new AppError(400, `"${slug}" is reserved for a built-in role`);
  }
  if (await RoleModel.exists({ $or: [{ _id: slug }, { slug }] })) {
    throw new AppError(409, `A role with slug "${slug}" already exists`);
  }

  const role = await RoleModel.create({
    _id: slug,
    name,
    slug,
    description: typeof req.body.description === 'string' ? req.body.description : '',
    permissionIds: req.body.permissionIds === undefined ? [] : cleanPermissionIds(req.body.permissionIds),
    isSystem: false,
    status: 'ACTIVE',
  });
  successResponse(res, toResponse(role.toObject() as IRole), 'Role created', 201);
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await RoleModel.findById(req.params.id);
  if (!role) throw new AppError(404, 'Role not found');

  const isSystem = role.isSystem || SYSTEM_ROLE_IDS.includes(role._id);
  const body = req.body as Record<string, unknown>;

  // Slug is the role id and never changes; only these fields are editable
  if ('slug' in body && body.slug !== role.slug) {
    throw new AppError(400, 'Role slug cannot be changed');
  }
  if ('name' in body) {
    const name = String(body.name || '').trim();
    if (!name) throw new AppError(400, 'Role name is required');
    role.name = name;
  }
  if ('description' in body) {
    role.description = typeof body.description === 'string' ? body.description : '';
  }
  if ('status' in body) {
    const status = body.status as IRole['status'];
    if (!ROLE_STATUSES.includes(status)) throw new AppError(400, 'Status must be ACTIVE or INACTIVE');
    if (isSystem && status !== 'ACTIVE') throw new AppError(400, 'System roles cannot be deactivated');
    role.status = status;
  }
  // System roles always keep full access; their permission list is not editable
  if ('permissionIds' in body && !isSystem) {
    role.permissionIds = cleanPermissionIds(body.permissionIds);
  }

  await role.save();
  successResponse(res, toResponse(role.toObject() as IRole), 'Role updated');
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const role = await RoleModel.findById(req.params.id);
  if (!role) throw new AppError(404, 'Role not found');
  if (role.isSystem || SYSTEM_ROLE_IDS.includes(role._id)) {
    throw new AppError(400, 'System roles cannot be deleted');
  }
  await role.deleteOne();
  successResponse(res, null, 'Role deleted');
});
