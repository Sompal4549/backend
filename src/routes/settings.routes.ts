import { Request, Response, Router } from 'express';
import Settings from '../models/settings.model';
import Page from '../models/page.model';
import { ComponentContentModel } from '../models/component-content.model';
import { asyncHandler } from '../utils/async-handler';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import {
  getIntegrationSettings,
  putIntegrationSettings,
  runIntegrationPageSpeed,
  testIntegrationSettings,
} from '../controllers/integration-settings.controller';

export const settingsRouter = Router();

// Google integrations (GA4 / Search Console / PageSpeed) — admin only, secrets are never returned
settingsRouter.get('/integrations', authMiddleware, adminMiddleware, getIntegrationSettings);
settingsRouter.put('/integrations', authMiddleware, adminMiddleware, putIntegrationSettings);
settingsRouter.post('/integrations/test', authMiddleware, adminMiddleware, testIntegrationSettings);
settingsRouter.get('/integrations/pagespeed', authMiddleware, adminMiddleware, runIntegrationPageSpeed);

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

    // Load layout header & footer to fill in any missing contact details
    const [headerDoc, footerDoc] = await Promise.all([
      ComponentContentModel.findOne({ key: 'layout.header' }).lean<{ data?: any }>(),
      ComponentContentModel.findOne({ key: 'layout.footer' }).lean<{ data?: any }>(),
    ]);

    const headerData = headerDoc?.data || {};
    const footerContact = footerDoc?.data?.contact || {};

    const defaultHelpline = headerData.phone || footerContact.phone || '+91 9654900525';
    const defaultWhatsapp = footerContact.whatsappPhone || headerData.phone || '+91 9654900525';
    const defaultEmail = headerData.email || footerContact.email || 'info@ensis.in';
    const defaultAddress = footerContact.address || '12/29, Site-II, Loni Road, Industrial Area, Mohan Nagar - 201007, India, Uttar Pradesh, India';

    if (!doc) {
      doc = await Settings.create({
        website,
        data: {
          websiteName: 'Ensis - Premium Panchkarma & Wellness Spaces',
          siteName: 'Ensis - Premium Panchkarma & Wellness Spaces',
          helplineNumber: defaultHelpline,
          whatsappNumber: defaultWhatsapp,
          supportEmail: defaultEmail,
          address: defaultAddress,
        },
      });
    } else {
      let modified = false;
      const data = doc.data || {};
      if (!data.helplineNumber) {
        data.helplineNumber = defaultHelpline;
        modified = true;
      }
      if (!data.whatsappNumber) {
        data.whatsappNumber = defaultWhatsapp;
        modified = true;
      }
      if (!data.supportEmail) {
        data.supportEmail = defaultEmail;
        modified = true;
      }
      if (!data.address) {
        data.address = defaultAddress;
        modified = true;
      }
      if (!data.siteName && data.websiteName) {
        data.siteName = data.websiteName;
        modified = true;
      }
      if (modified) {
        doc.data = data;
        doc.markModified('data');
        await doc.save();
      }
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
    delete bodyPayload._id;
    delete bodyPayload.id;
    delete bodyPayload.createdAt;
    delete bodyPayload.updatedAt;
    delete bodyPayload.__v;

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

    // Two-way sync to layout.header and layout.footer so site-wide header & footer reflect settings immediately
    try {
      const headerUpdates: Record<string, any> = {};
      const footerUpdates: Record<string, any> = {};

      if (bodyPayload.helplineNumber) {
        headerUpdates['data.phone'] = bodyPayload.helplineNumber;
        footerUpdates['data.contact.phone'] = bodyPayload.helplineNumber;
      }
      if (bodyPayload.supportEmail) {
        headerUpdates['data.email'] = bodyPayload.supportEmail;
        footerUpdates['data.contact.email'] = bodyPayload.supportEmail;
      }
      if (bodyPayload.whatsappNumber) {
        footerUpdates['data.contact.whatsappPhone'] = bodyPayload.whatsappNumber;
      }
      if (bodyPayload.address) {
        footerUpdates['data.contact.address'] = bodyPayload.address;
      }

      if (Object.keys(headerUpdates).length > 0) {
        await ComponentContentModel.findOneAndUpdate({ key: 'layout.header' }, { $set: headerUpdates });
      }
      if (Object.keys(footerUpdates).length > 0) {
        await ComponentContentModel.findOneAndUpdate({ key: 'layout.footer' }, { $set: footerUpdates });
      }
    } catch (syncErr) {
      console.warn('Failed to sync settings to layout header/footer:', syncErr);
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
