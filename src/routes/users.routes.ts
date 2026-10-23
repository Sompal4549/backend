import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { UserModel } from '../models/user.model';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { assertStaffAssignableRole } from '../constants/permissions.constants';

export const usersRouter = Router();

// Protect staff management endpoints
usersRouter.use(authMiddleware, adminMiddleware);

// GET /api/v1/users/admin/staff
usersRouter.get(
  '/admin/staff',
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await UserModel.find().sort({ createdAt: -1 }).lean();

    const staffMembers = users.map((u: any) => ({
      _id: String(u._id),
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      employeeId: u.employeeId || '',
      avatarUrl: u.avatar || undefined,
      roleName: u.role || 'Admin',
      status: u.lockUntil && new Date(u.lockUntil) > new Date() ? 'LOCKED' : 'ACTIVE',
      isEmailVerified: Boolean(u.emailVerified),
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt || ''),
    }));

    successResponse(res, staffMembers, 'Staff list retrieved');
  })
);

// POST /api/v1/users/admin/staff (Invite / Create Staff)
usersRouter.post(
  '/admin/staff',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, phone, employeeId, roleId } = req.body;
    if (!name || !email) {
      throw new AppError(400, 'Name and email are required');
    }
    if (roleId) assertStaffAssignableRole(roleId);

    const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new AppError(409, 'User with this email already exists');
    }

    const temporaryPassword = crypto.randomBytes(6).toString('hex') + 'A1!';
    const user = await UserModel.create({
      name,
      email: email.toLowerCase().trim(),
      phone: phone || '',
      employeeId: employeeId || '',
      role: roleId || 'admin',
      password: temporaryPassword,
      emailVerified: true,
      phoneVerified: true,
    });

    const staffMember = {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      employeeId: user.employeeId || '',
      avatarUrl: user.avatar,
      roleName: user.role,
      status: 'ACTIVE',
      isEmailVerified: true,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
    };

    successResponse(
      res,
      {
        user: staffMember,
        temporaryPassword,
      },
      'Staff member invited successfully',
      201
    );
  })
);

// PATCH /api/v1/users/admin/staff/:id
usersRouter.patch(
  '/admin/staff/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, phone, employeeId, roleId } = req.body;
    const update: Record<string, unknown> = {};
    if (name) update.name = name;
    if (email) update.email = email.toLowerCase().trim();
    if (phone !== undefined) update.phone = phone;
    if (employeeId !== undefined) update.employeeId = employeeId;
    if (roleId) {
      assertStaffAssignableRole(roleId);
      update.role = roleId;
    }

    const user = await UserModel.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!user) throw new AppError(404, 'Staff member not found');

    successResponse(
      res,
      {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        employeeId: user.employeeId || '',
        avatarUrl: user.avatar,
        roleName: user.role,
        status: user.isLocked() ? 'LOCKED' : 'ACTIVE',
        isEmailVerified: Boolean(user.emailVerified),
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      },
      'Staff member updated'
    );
  })
);

// PATCH /api/v1/users/admin/staff/:id/status
usersRouter.patch(
  '/admin/staff/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const lockUntil = status === 'LOCKED' ? new Date(Date.now() + 365 * 24 * 3600 * 1000) : null;
    const user = await UserModel.findByIdAndUpdate(req.params.id, { lockUntil }, { new: true });
    if (!user) throw new AppError(404, 'Staff member not found');

    successResponse(
      res,
      {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        employeeId: user.employeeId || '',
        roleName: user.role,
        status: status === 'LOCKED' ? 'LOCKED' : 'ACTIVE',
        isEmailVerified: Boolean(user.emailVerified),
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      },
      'Staff status updated'
    );
  })
);

// PATCH /api/v1/users/admin/staff/:id/role
usersRouter.patch(
  '/admin/staff/:id/role',
  asyncHandler(async (req: Request, res: Response) => {
    const { roleId } = req.body;
    assertStaffAssignableRole(roleId);
    const user = await UserModel.findByIdAndUpdate(req.params.id, { role: roleId }, { new: true });
    if (!user) throw new AppError(404, 'Staff member not found');

    successResponse(
      res,
      {
        _id: String(user._id),
        name: user.name,
        email: user.email,
        roleName: user.role,
        status: 'ACTIVE',
        isEmailVerified: Boolean(user.emailVerified),
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      },
      'Staff role updated'
    );
  })
);

// DELETE /api/v1/users/admin/staff/:id
usersRouter.delete(
  '/admin/staff/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) throw new AppError(404, 'Staff member not found');
    successResponse(res, { deleted: true }, 'Staff member deleted');
  })
);
