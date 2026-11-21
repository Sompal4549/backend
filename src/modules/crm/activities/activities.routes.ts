import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { adminMiddleware } from '../../../middlewares/admin.middleware';

export const crmActivitiesRouter = Router();
crmActivitiesRouter.use(authMiddleware, adminMiddleware);
crmActivitiesRouter.get('/:id', (_req, res) => res.json({ success: true, message: 'Activity', data: {} }));
crmActivitiesRouter.post('/:id/log', (_req, res) => res.json({ success: true, message: 'Activity logged', data: { id: 'ACT-' } }));