import { Response } from 'express';
import { successResponse } from '../../../utils/api-response';
import { asyncHandler } from '../../../utils/async-handler';
import { leadsService } from './leads.service';

export const getLeadsOverview = asyncHandler(async (_req, res: Response) => {
  const overview = await leadsService.getOverview();
  successResponse(res, overview, 'Leads overview retrieved');
});

export const getLead = asyncHandler(async (req, res: Response) => {
  const lead = await leadsService.getLeadById(req.params.id);
  successResponse(res, lead, 'Lead retrieved');
});

export const createLead = asyncHandler(async (req, res: Response) => {
  const body = req.body || {};
  const name = String(body.name || body.fullName || body.firstName || '').trim();
  const phone = String(body.phone || body.mobile || '').trim();
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Contact name is required.';
  if (!phone) errors.mobile = 'Mobile number is required.';
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
  const lead = await leadsService.createLead(req.body);
  successResponse(res, lead, 'Lead created', 201);
});

export const updateLead = asyncHandler(async (req, res: Response) => {
  await leadsService.updateLead(req.params.id, req.body);
  successResponse(res, { id: req.params.id }, 'Lead updated');
});

export const reassignLead = asyncHandler(async (req, res: Response) => {
  const { owner, reason } = req.body;
  if (!owner || !reason) {
    return successResponse(res, { success: false, message: 'Owner and reason are required.' }, 'Invalid request', 400);
  }
  await leadsService.updateLead(req.params.id, { assignedTo: owner, reassignReason: reason });
  successResponse(res, { id: req.params.id, owner }, 'Lead reassigned');
});

export const batchImport = asyncHandler(async (req, res: Response) => {
  const result = await leadsService.batchImport(req.body);
  successResponse(res, result, 'Lead import completed', 201);
});

export const getImports = asyncHandler(async (_req, res: Response) => {
  const imports = await leadsService.getImports();
  successResponse(res, imports, 'Lead imports retrieved');
});

export const previewImport = asyncHandler(async (req, res: Response) => {
  const preview = await leadsService.previewImport(req.body);
  successResponse(res, preview, 'Import preview generated');
});
