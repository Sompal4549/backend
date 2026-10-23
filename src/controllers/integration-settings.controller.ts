import { Request, Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  getIntegrationSettingsView,
  getPageSpeedReport,
  isPublicSiteUrl,
  pageSpeedReadiness,
  resolveIntegrations,
  testIntegrations,
  updateIntegrationSettings,
} from '../services/integration-settings.service';

const EDITABLE_FIELDS = [
  'ga4PropertyId',
  'searchConsoleSiteUrl',
  'serviceAccountJson',
  'pagespeedApiKey',
  'clearServiceAccount',
  'clearPagespeedApiKey',
] as const;

const pickEditable = (body: Record<string, unknown>) => {
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  return data;
};

const editorName = (req: AuthRequest) => (req.user as { name?: string } | undefined)?.name || '';

export const getIntegrationSettings = asyncHandler(async (_req: Request, res: Response) => {
  res.set('Cache-Control', 'no-store');
  successResponse(res, await getIntegrationSettingsView(), 'Integration settings retrieved');
});

export const putIntegrationSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const view = await updateIntegrationSettings(pickEditable(req.body || {}), editorName(req));
  successResponse(res, view, 'Integration settings saved');
});

export const testIntegrationSettings = asyncHandler(async (_req: Request, res: Response) => {
  const result = await testIntegrations();
  successResponse(res, result, 'Integration test finished');
});

/**
 * GET /settings/integrations/pagespeed?url=&strategy=mobile|desktop&refresh=1
 * Runs PageSpeed Insights with the stored key for a page on the public site
 * (used by the admin's /pagespeed route handler). Returns the trimmed PSI payload.
 */
export const runIntegrationPageSpeed = asyncHandler(async (req: Request, res: Response) => {
  const url = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  const strategy = req.query.strategy === 'desktop' ? 'desktop' : 'mobile';
  const force = req.query.refresh === '1';

  if (!isPublicSiteUrl(url)) throw new AppError(400, 'Enter a valid URL on the public site');

  const creds = await resolveIntegrations();
  const readiness = pageSpeedReadiness(creds);
  if (!readiness.configured) throw new AppError(readiness.isError ? 500 : 409, readiness.reason);

  try {
    const report = await getPageSpeedReport(creds, url, strategy, force);
    successResponse(res, report, 'PageSpeed report');
  } catch (error) {
    throw new AppError(502, `PageSpeed Insights failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
});
