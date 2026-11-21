import { Router } from 'express';
import {
  getPipeline,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  updateStage,
  logActivity,
  removeOpportunity,
  restoreOpportunity,
} from './opportunities.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { adminMiddleware } from '../../../middlewares/admin.middleware';

export const crmOpportunitiesRouter = Router();
crmOpportunitiesRouter.use(authMiddleware, adminMiddleware);
crmOpportunitiesRouter.get('/pipeline', getPipeline);
crmOpportunitiesRouter.get('/:id', getOpportunity);
crmOpportunitiesRouter.post('/', createOpportunity);
crmOpportunitiesRouter.put('/:id', updateOpportunity);
crmOpportunitiesRouter.patch('/:id/stage', updateStage);
crmOpportunitiesRouter.post('/:id/activities', logActivity);
crmOpportunitiesRouter.delete('/:id', removeOpportunity);
crmOpportunitiesRouter.post('/:id/restore', restoreOpportunity);