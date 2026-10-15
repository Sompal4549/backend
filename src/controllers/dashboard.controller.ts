import { Request, Response } from 'express';
import { asyncHandler } from '../utils/async-handler';
import { successResponse } from '../utils/api-response';
import { AppError } from '../utils/app-error';
import {
  buildLiveDashboardOverview,
  buildPageSpeedSource,
  buildIndexCoverageSource,
  buildSiteStatusSource,
  listEnquiries,
} from '../services/dashboard.service';
import { adminUpdateEnquiry, deleteEnquiryById } from '../services/admin.service';

export const getDashboardOverview = asyncHandler(async (_req: Request, res: Response) => {
  const overview = await buildLiveDashboardOverview();
  successResponse(res, overview, 'Live dashboard overview');
});

export const getPageSpeedController = asyncHandler(async (_req: Request, res: Response) => {
  const source = await buildPageSpeedSource();
  successResponse(res, source, 'Page speed report');
});

export const getIndexCoverageController = asyncHandler(async (_req: Request, res: Response) => {
  const source = await buildIndexCoverageSource();
  successResponse(res, source, 'Index coverage report');
});

export const getSiteStatusController = asyncHandler(async (_req: Request, res: Response) => {
  const source = await buildSiteStatusSource();
  successResponse(res, source, 'Site status report');
});

export const listEnquiriesController = asyncHandler(async (req: Request, res: Response) => {
  const page = Number.parseInt(String(req.query.page ?? '1'), 10);
  const limit = Number.parseInt(String(req.query.limit ?? '20'), 10);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  const result = await listEnquiries({
    page: Number.isNaN(page) ? 1 : page,
    limit: Number.isNaN(limit) ? 20 : limit,
    search,
    status,
  });

  successResponse(res, result, 'Enquiries retrieved');
});

export const updateEnquiryController = asyncHandler(async (req: Request, res: Response) => {
  const { status, isRead } = req.body;
  const update: { status?: string; isRead?: boolean } = {};

  if (status !== undefined) {
    const validStatuses = ['pending', 'contacted', 'resolved', 'cancelled', 'closed', 'new', 'qualified'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    update.status = status;
  }

  if (isRead !== undefined) {
    update.isRead = Boolean(isRead);
  }

  if (Object.keys(update).length === 0) {
    throw new AppError(400, 'Nothing to update.');
  }

  const enquiry = await adminUpdateEnquiry(req.params.id, update);
  successResponse(res, enquiry, 'Enquiry updated');
});

export const deleteEnquiryController = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await deleteEnquiryById(req.params.id);
  if (!deleted) {
    throw new AppError(404, 'Enquiry not found');
  }
  successResponse(res, null, 'Enquiry deleted');
});
