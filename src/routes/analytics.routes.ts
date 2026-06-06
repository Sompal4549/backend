import { Request, Response, Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware.ts';

export const analyticsRouter = Router();

/**
 * PUBLIC ROUTE: Track clicks for buttons/social
 */
analyticsRouter.post(
  '/track-click',
  [
    body('buttonName').notEmpty(), // e.g., 'whatsapp_float', 'call_header'
    body('pageUrl').notEmpty(),
  ],
  validateRequest,
  async (_req: Request, res: Response) => {
    // TODO: Implement clickAnalyticsService.incrementClick(req.body.buttonName, req.body.pageUrl)
    res.json({ success: true });
  }
);

/**
 * ADMIN ROUTE: Global Technical SEO (GA, GTM, GSC)
 */
analyticsRouter.put(
  '/settings',
  [
    body('googleAnalyticsId').optional().isString().withMessage('GA ID or full script snippet'),
    body('gtmId').optional().isString().withMessage('GTM ID or full script snippet'),
    body('gscVerificationCode').optional().isString().withMessage('Google Search Console verification code'),
    body('globalSchema.organization').optional().isString().withMessage('Organization JSON-LD Schema'),
    body('globalSchema.localBusiness').optional().isString().withMessage('Local Business JSON-LD Schema'),
    body('siteMeta.robotsTxt').optional().isString().withMessage('Content for robots.txt'),
  ],
  validateRequest,
  async (_req: Request, res: Response) => {
    // TODO: Implement siteSettingsService.updateGlobalSeoSettings(_req.body)
    res.json({ success: true });
  }
);
