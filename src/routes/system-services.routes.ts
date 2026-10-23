import { Router, Request, Response } from 'express';
import { SystemServiceModel } from '../models/system-service.model';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';

export const systemServicesRouter = Router();

const formatPhone = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  return phone;
};

// Summary endpoint used by Topbar and ServiceRenewalChips
systemServicesRouter.get(
  '/summary',
  asyncHandler(async (_req: Request, res: Response) => {
    const services = await SystemServiceModel.find().sort({ expiryDate: 1 }).lean();
    successResponse(res, services, 'System services summary fetched');
  })
);

// Access Requirements for Security Center
systemServicesRouter.get(
  '/access/requirements',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const adminUser = ((req as AuthRequest).user as any) || {};
    const formattedPhone = adminUser.phone ? formatPhone(adminUser.phone) : '';

    successResponse(
      res,
      {
        expiresInMinutes: 60,
        requiredRoles: ['self'],
        requester: {
          id: adminUser.id || adminUser._id ? String(adminUser.id || adminUser._id) : 'admin-1',
          name: adminUser.name || 'Ensis Admin',
          email: adminUser.email || '',
          phone: formattedPhone || adminUser.phone || '',
          twoFactorEnabled: Boolean(adminUser.isTwoFactorEnabled),
        },
        approvers: [],
      },
      'Access requirements fetched'
    );
  })
);

// Access Status
systemServicesRouter.get(
  '/access/status',
  asyncHandler(async (_req: Request, res: Response) => {
    successResponse(
      res,
      {
        valid: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      'Access status fetched'
    );
  })
);

// Send Access OTP
systemServicesRouter.post(
  '/access/send-otp',
  asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, { success: true, message: 'Access verification code sent successfully.' });
  })
);

// Verify Access
systemServicesRouter.post(
  '/access/verify',
  asyncHandler(async (_req: Request, res: Response) => {
    successResponse(res, {
      token: 'ensis-system-services-grant-' + Date.now(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      expiresInMinutes: 1440,
    });
  })
);

// List all services
systemServicesRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const services = await SystemServiceModel.find().sort({ createdAt: -1 }).lean();
    successResponse(res, services, 'System services fetched');
  })
);

// Admin CRUD
systemServicesRouter.get(
  '/admin',
  asyncHandler(async (_req: Request, res: Response) => {
    const services = await SystemServiceModel.find().sort({ createdAt: -1 }).lean();
    successResponse(res, services, 'System services fetched');
  })
);

systemServicesRouter.get(
  '/admin/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const service = await SystemServiceModel.findById(req.params.id);
    if (!service) throw new AppError(404, 'System service not found');
    successResponse(res, service, 'System service fetched');
  })
);

systemServicesRouter.post(
  '/admin',
  asyncHandler(async (req: Request, res: Response) => {
    const service = await SystemServiceModel.create(req.body);
    successResponse(res, service, 'System service created', 201);
  })
);

systemServicesRouter.put(
  '/admin/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const service = await SystemServiceModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!service) throw new AppError(404, 'System service not found');
    successResponse(res, service, 'System service updated');
  })
);

systemServicesRouter.delete(
  '/admin/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const service = await SystemServiceModel.findByIdAndDelete(req.params.id);
    if (!service) throw new AppError(404, 'System service not found');
    successResponse(res, { deleted: true }, 'System service deleted');
  })
);
