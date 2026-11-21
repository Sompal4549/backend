import { Router } from 'express';
import { getCompanyDashboard } from './dashboard.controller';

export const crmDashboardRouter = Router();
crmDashboardRouter.get('/company', getCompanyDashboard);