import { Request, Response, Router } from 'express';
import Settings from '../models/settings.model';
import Page from '../models/page.model';
import { asyncHandler } from '../utils/async-handler';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

export const settingsRouter = Router();

const PAGE_CONFIG_KEY_PATTERN = /^[A-Za-z0-9]+Page$/;
const PAGE_STATUSES = ['Published', 'Draft'] as const;

// GET /settings?website=ensis
settingsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const website = (req.query.website as string) || 'ensis';
    let doc = await Settings.findOne({ website });
    if (!doc && website !== 'ensis') {
      doc = await Settings.findOne({ website: 'ensis' });
    }

    if (!doc) {
      doc = await Settings.create({
        website,
        data: {
          websiteName: 'Ensis - Premium Panchkarma & Wellness Spaces',
          helplineNumber: '+91 9876543210',
          supportEmail: 'info@ensis.in',
        },
      });
    }

    const payload = doc.data || {};
    return res.status(200).json({
      success: true,
      data: payload,
      ...payload,
    });
  })
);

// GET /settings/page-statuses?website=ensis
settingsRouter.get(
  '/page-statuses',
  asyncHandler(async (req: Request, res: Response) => {
    const website = (req.query.website as string) || 'ensis';
    const doc = await Settings.findOne({ website }).lean<{ data?: Record<string, any> }>();
    const data = doc?.data || {};

    const pages: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!PAGE_CONFIG_KEY_PATTERN.test(key) || !value || typeof value !== 'object') continue;
      const status = (value as { status?: unknown }).status;
      if (status === 'Published' || status === 'Draft') pages[key] = status;
    }

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, data: { pages } });
  })
);

// PATCH /settings/page-status?website=ensis
settingsRouter.patch(
  '/page-status',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const website = (req.query.website as string) || req.body.website || 'ensis';
    const { configKey, status, updatedBy } = req.body || {};

    if (typeof configKey !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid configKey' });
    }
    if (!PAGE_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be Published or Draft' });
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      [`data.${configKey}.status`]: status,
      [`data.${configKey}.lastUpdated`]: now,
    };
    if (status === 'Published') update[`data.${configKey}.publishedAt`] = now;
    if (typeof updatedBy === 'string' && updatedBy.trim()) {
      update[`data.${configKey}.updatedBy`] = updatedBy.trim();
    }

    const doc = await Settings.findOneAndUpdate(
      { website },
      { $set: update },
      { new: true, upsert: true }
    ).lean<{ data?: Record<string, any> }>();

    // Also sync to Page collection if exists
    try {
      await Page.findOneAndUpdate(
        { $or: [{ configKey }, { slug: configKey }] },
        {
          $set: {
            status,
            updatedBy: updatedBy || 'Admin',
            updatedAt: now,
          },
        }
      );
    } catch {
      // non-blocking
    }

    return res.status(200).json({
      success: true,
      message: status === 'Published' ? 'Page published' : 'Page unpublished',
      data: { configKey, ...(doc?.data?.[configKey] || {}) },
    });
  })
);

// PUT /settings?website=ensis
settingsRouter.put(
  '/',
  authMiddleware,
  adminMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const website = (req.query.website as string) || req.body.website || 'ensis';
    const bodyPayload = { ...req.body };
    delete bodyPayload.website;

    let doc = await Settings.findOne({ website });
    const currentData = doc ? doc.data || {} : {};

    const mergedData = {
      ...currentData,
      ...bodyPayload,
    };

    // Deep merge known page keys if supplied
    for (const key of Object.keys(bodyPayload)) {
      if (typeof bodyPayload[key] === 'object' && bodyPayload[key] !== null) {
        mergedData[key] = {
          ...(currentData[key] || {}),
          ...bodyPayload[key],
        };
        if (Array.isArray(bodyPayload[key].sections)) {
          mergedData[key].sections = bodyPayload[key].sections;
        }
      }
    }

    if (!doc) {
      doc = await Settings.create({
        website,
        data: mergedData,
      });
    } else {
      doc.data = mergedData;
      doc.markModified('data');
      await doc.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: doc.data,
      ...doc.data,
    });
  })
);

export default settingsRouter;
