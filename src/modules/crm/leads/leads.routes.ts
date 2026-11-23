import { Router } from 'express';
import { getLeadsOverview, getLead, createLead, getImports, previewImport, updateLead, reassignLead, batchImport } from './leads.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { adminMiddleware } from '../../../middlewares/admin.middleware';

export const crmLeadsRouter = Router();

crmLeadsRouter.use(authMiddleware, adminMiddleware);
crmLeadsRouter.get('/overview', getLeadsOverview);
crmLeadsRouter.get('/imports', getImports);
crmLeadsRouter.post('/imports/preview', previewImport);
crmLeadsRouter.post('/imports', batchImport);
crmLeadsRouter.get('/:id', getLead);
crmLeadsRouter.post('/', createLead);
crmLeadsRouter.put('/:id', updateLead);
crmLeadsRouter.put('/:id/reassign', reassignLead);
