import { Router } from 'express';
import { listActivityLogs } from '../controllers/activity-log.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

export const activityLogRouter = Router();

activityLogRouter.get('/', authMiddleware, adminMiddleware, listActivityLogs);