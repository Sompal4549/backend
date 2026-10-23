import { Router } from 'express';
import { param } from 'express-validator';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getDashboardOverview,
  getPageSpeedController,
  getIndexCoverageController,
  getSiteStatusController,
  listEnquiriesController,
  updateEnquiryController,
  deleteEnquiryController,
} from '../controllers/dashboard.controller';
import { createEnquiryAdmin } from '../controllers/enquiry.controller';

/**
 * Live dashboard endpoints (admin protected).
 * Mounted on both /api/v1/dashboard and /api/dashboard so the panel can use
 * either base path.
 */
export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware, adminMiddleware);
dashboardRouter.get('/', getDashboardOverview);
dashboardRouter.get('/overview', getDashboardOverview);
dashboardRouter.get('/pagespeed', getPageSpeedController);
dashboardRouter.get('/index-coverage', getIndexCoverageController);
dashboardRouter.get('/site-status', getSiteStatusController);

/**
 * Enquiries list + mutations (admin protected).
 * Mounted on /api/enquiries, /api/v1/enquiries and the legacy
 * /api/v1/contact-enquiry path used by the admin panel's contactEnquiryApi.
 */
export const enquiryListRouter = Router();
enquiryListRouter.use(authMiddleware, adminMiddleware);
enquiryListRouter.get('/', listEnquiriesController);
enquiryListRouter.get('/admin', listEnquiriesController);
enquiryListRouter.post('/admin', createEnquiryAdmin);
enquiryListRouter.put(
  '/admin/:id/status',
  [param('id').isMongoId().withMessage('Valid enquiry ID is required')],
  validateRequest,
  updateEnquiryController
);
enquiryListRouter.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Valid enquiry ID is required'),
  ],
  validateRequest,
  updateEnquiryController
);
enquiryListRouter.delete(
  '/:id',
  [
    param('id').isMongoId().withMessage('Valid enquiry ID is required'),
  ],
  validateRequest,
  deleteEnquiryController
);
