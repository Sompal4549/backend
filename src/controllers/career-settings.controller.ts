import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { getOrCreateCareerSettings } from '../models/career-settings.model';

// GET /careers/admin/settings
export const getAdminSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateCareerSettings();
  successResponse(res, settings, 'Career settings retrieved');
});

// PUT /careers/admin/settings
export const updateAdminSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateCareerSettings();
  const body = req.body || {};

  if (Array.isArray(body.hrEmails)) {
    settings.hrEmails = body.hrEmails.map((e: string) => String(e).trim()).filter(Boolean);
  }
  if (typeof body.defaultEligibilityThreshold === 'number') {
    settings.defaultEligibilityThreshold = body.defaultEligibilityThreshold;
  }
  if (typeof body.defaultPartialMatchMin === 'number') {
    settings.defaultPartialMatchMin = body.defaultPartialMatchMin;
  }
  if (body.hrContact && typeof body.hrContact === 'object') {
    settings.hrContact = {
      email: String(body.hrContact.email || settings.hrContact.email).trim(),
      phone: String(body.hrContact.phone || settings.hrContact.phone).trim(),
      address: String(body.hrContact.address || settings.hrContact.address).trim(),
    };
  }
  if (typeof body.retentionDays === 'number') {
    settings.retentionDays = body.retentionDays;
  }
  if (body.resultMessages) {
    settings.resultMessages = body.resultMessages;
  }

  await settings.save();
  successResponse(res, settings, 'Career settings updated');
});

// GET /careers/settings (Public contact / thresholds info)
export const getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateCareerSettings();
  successResponse(
    res,
    {
      defaultEligibilityThreshold: settings.defaultEligibilityThreshold,
      defaultPartialMatchMin: settings.defaultPartialMatchMin,
      hrContact: settings.hrContact,
    },
    'Public career settings retrieved'
  );
});

// GET /careers/admin/result-messages (backward compatibility)
export const getResultMessages = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateCareerSettings();
  const defaultMessages = {
    eligible: {
      title: "You're Eligible to Apply!",
      description: 'Your profile matches the core qualifications for this role at Ensis.',
    },
    partial: {
      title: 'Partial Match Identified',
      description: 'You meet several requirements with opportunity to highlight transferable skills.',
    },
    notEligible: {
      title: 'Not Eligible for This Role',
      description: 'Your background does not currently match the core qualifications for this position.',
    },
    ...(settings.resultMessages || {}),
  };
  successResponse(res, defaultMessages, 'Result messages retrieved');
});

// PUT /careers/admin/result-messages (backward compatibility)
export const updateResultMessages = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getOrCreateCareerSettings();
  settings.resultMessages = req.body || {};
  await settings.save();
  successResponse(res, settings.resultMessages, 'Result messages updated');
});
