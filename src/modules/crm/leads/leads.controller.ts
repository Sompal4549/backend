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
  const lead = await leadsService.createLead(req.body);
  successResponse(res, lead, 'Lead created', 201);
});

export const updateLead = asyncHandler(async (req, res: Response) => {
  await leadsService.updateLead(req.params.id, req.body);
  successResponse(res, { id: req.params.id }, 'Lead updated');
});

export const getImports = asyncHandler(async (_req, res: Response) => {
  const imports = await leadsService.getImports();
  successResponse(res, imports, 'Lead imports retrieved');
});

export const previewImport = asyncHandler(async (req, res: Response) => {
  const preview = await leadsService.previewImport(req.body);
  successResponse(res, preview, 'Import preview generated');
});
