import { Response } from 'express';
import { successResponse } from '../../../utils/api-response';
import { asyncHandler } from '../../../utils/async-handler';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { clientsService } from './clients.service';

export const getClientsOverview = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await clientsService.getOverview();
  successResponse(res, result, 'Clients overview retrieved');
});

export const getClient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const client = await clientsService.getById(req.params.id);
  successResponse(res, client, 'Client retrieved');
});

export const createClient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body || {};
  const name = String(body.name || body.company || body.companyName || '').trim();
  if (!name) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Client name or company is required.',
      fieldErrors: { name: 'Client name or company is required.' },
      errors: ['Client name or company is required.'],
      timestamp: new Date().toISOString(),
    });
  }
  const client = await clientsService.create(req.body);
  successResponse(res, client, 'Client created', 201);
});

export const updateClient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const client = await clientsService.update(req.params.id, req.body);
  successResponse(res, client, 'Client updated');
});

export const removeClient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const deletedBy = (req.user as any)?._id?.toString();
  await clientsService.softDelete(req.params.id, deletedBy);
  successResponse(res, null, 'Client moved to deleted list');
});

export const restoreClient = asyncHandler(async (req: AuthRequest, res: Response) => {
  const client = await clientsService.restore(req.params.id);
  successResponse(res, client, 'Client restored successfully');
});