import { Router } from 'express';
import { getClientsOverview, getClient, createClient, updateClient, removeClient, restoreClient } from './clients.controller';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { adminMiddleware } from '../../../middlewares/admin.middleware';

export const crmClientsRouter = Router();
crmClientsRouter.use(authMiddleware, adminMiddleware);
crmClientsRouter.get('/overview', getClientsOverview);
crmClientsRouter.get('/:id', getClient);
crmClientsRouter.post('/', createClient);
crmClientsRouter.put('/:id', updateClient);
crmClientsRouter.delete('/:id', removeClient);
crmClientsRouter.post('/:id/restore', restoreClient);