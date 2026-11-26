import { Router } from 'express';
import {
  getLeadsOverview,
  getLead,
  createLead,
  getImports,
  previewImport,
  updateLead,
  deleteLead,
  reassignLead,
  batchImport,
  getLeadMatches,
  postMatchDecision,
  updateNextAction,
  recordConversation,
} from './leads.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { crmAccessMiddleware } from '../../../middlewares/crm-access.middleware';

export const crmLeadsRouter = Router();

crmLeadsRouter.use(authMiddleware, crmAccessMiddleware);
crmLeadsRouter.get('/overview', getLeadsOverview);
crmLeadsRouter.get('/matches', getLeadMatches);
crmLeadsRouter.post('/matches/decision', postMatchDecision);
crmLeadsRouter.get('/imports', getImports);
crmLeadsRouter.post('/imports/preview', previewImport);
crmLeadsRouter.post('/imports', batchImport);
crmLeadsRouter.get('/:id', getLead);
crmLeadsRouter.post('/', createLead);
crmLeadsRouter.put('/:id', updateLead);
crmLeadsRouter.post('/:id/next-action', updateNextAction);
crmLeadsRouter.post('/:id/conversation', recordConversation);
crmLeadsRouter.delete('/:id', deleteLead);
crmLeadsRouter.put('/:id/reassign', reassignLead);
