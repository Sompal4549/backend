import { Response } from 'express';
import { successResponse } from '../../../utils/api-response';
import { asyncHandler } from '../../../utils/async-handler';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { opportunitiesService } from './opportunities.service';

export const getPipeline = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const pipeline = await opportunitiesService.getPipeline();
  successResponse(res, pipeline, 'Sales pipeline retrieved');
});

export const getOpportunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const opp = await opportunitiesService.getById(req.params.id);
  successResponse(res, opp, 'Opportunity retrieved');
});

export const createOpportunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body || {};
  const title = String(body.title || body.name || '').trim();
  const client = String(body.client || body.clientName || '').trim();
  const errors: Record<string, string> = {};
  if (!title) errors.title = 'Opportunity title is required.';
  if (!client) errors.client = 'Client is required.';
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
  const opp = await opportunitiesService.create(req.body);
  successResponse(res, opp, 'Opportunity created', 201);
});

export const updateOpportunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const opp = await opportunitiesService.update(req.params.id, req.body);
  successResponse(res, opp, 'Opportunity updated');
});

export const updateStage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const opp = await opportunitiesService.updateStage(req.params.id, req.body);
  successResponse(res, opp, 'Stage updated');
});

export const logActivity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body || {};
  const channel = String(body.channel || body.type || '').trim();
  const notes = String(body.notes || body.summary || body.description || body.text || '').trim();
  const errors: Record<string, string> = {};
  if (!channel) errors.channel = 'Activity channel / type is required.';
  if (!notes) errors.notes = 'Activity notes / summary is required.';
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
  const activity = await opportunitiesService.addActivity(req.params.id, req.body);
  successResponse(res, activity, 'Activity logged', 201);
});

export const removeOpportunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const deletedBy = (req.user as any)?._id?.toString();
  await opportunitiesService.softDelete(req.params.id, deletedBy);
  successResponse(res, null, 'Opportunity moved to deleted list');
});

export const restoreOpportunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const opp = await opportunitiesService.restore(req.params.id);
  successResponse(res, opp, 'Opportunity restored successfully');
});