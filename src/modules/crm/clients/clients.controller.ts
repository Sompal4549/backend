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
  const contact = String(body.contact || body.primaryContact || body.contactPerson || name || 'Primary Contact').trim();
  const phone = String(body.phone || body.mobile || '').trim();
  const email = String(body.email || body.officialEmail || '').trim().toLowerCase();
  const type = String(body.type || body.clientType || 'Ayurveda Clinic').trim();
  const city = String(body.city || 'Delhi NCR').trim();

  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Client name is required.';
  if (!phone && !email) errors.phone = 'Enter at least one contact method (phone or email).';
  if (email && (!email.includes('@') || !email.includes('.'))) errors.email = 'Email address is not valid.';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: Object.values(errors)[0],
      fieldErrors: errors,
      errors: Object.values(errors),
      timestamp: new Date().toISOString(),
    });
  }
  const client = await clientsService.create({
    ...body,
    name,
    contact,
    phone,
    email,
    type,
    city,
  });
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