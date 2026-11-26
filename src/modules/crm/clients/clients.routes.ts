import { Router } from 'express';
import {
  getClientsOverview,
  getClient,
  getCustomer360,
  updateClientPreferences,
  recordClientConversation,
  createClient,
  updateClient,
  removeClient,
  restoreClient,
} from './clients.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { adminMiddleware } from '../../../middlewares/admin.middleware';
import { crmAccessMiddleware } from '../../../middlewares/crm-access.middleware';

export const crmClientsRouter = Router();
crmClientsRouter.use(authMiddleware, crmAccessMiddleware);
crmClientsRouter.get('/overview', getClientsOverview);
crmClientsRouter.get('/:id/customer-360', getCustomer360);
crmClientsRouter.put('/:id/preferences', updateClientPreferences);
crmClientsRouter.post('/:id/conversation', recordClientConversation);
crmClientsRouter.get('/:id', getClient);
crmClientsRouter.post('/', createClient);
crmClientsRouter.put('/:id', updateClient);
crmClientsRouter.delete('/:id', adminMiddleware, removeClient);
crmClientsRouter.post('/:id/restore', adminMiddleware, restoreClient);