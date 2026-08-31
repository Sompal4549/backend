import { Response } from 'express';
import {
  createNewInvoice,
  fetchLeadInvoices,
  fetchAllInvoices,
  fetchInvoice,
  updateInvoice,
  removeInvoice,
  fetchLeadInvoiceStats,
  sendInvoiceEmail,
  sendInvoiceWhatsApp,
} from '../services/invoice.service';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AuthRequest } from '../middlewares/auth.middleware';

export const createInvoiceCtrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await createNewInvoice(req.body, req.user!.id);
  successResponse(res, invoice, 'Invoice created', 201);
});

export const getLeadInvoices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { leadId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const result = await fetchLeadInvoices(leadId, page, limit);
  successResponse(res, result, 'Invoices retrieved');
});

export const getAllInvoicesCtrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const result = await fetchAllInvoices(page, limit, { type, status, search });
  successResponse(res, result, 'Invoices retrieved');
});

export const getInvoiceByIdCtrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await fetchInvoice(req.params.id);
  successResponse(res, invoice, 'Invoice retrieved');
});

export const updateInvoiceCtrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const invoice = await updateInvoice(req.params.id, req.body);
  successResponse(res, invoice, 'Invoice updated');
});

export const deleteInvoiceCtrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  await removeInvoice(req.params.id);
  successResponse(res, null, 'Invoice deleted');
});

export const getLeadInvoiceStatsCtrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const stats = await fetchLeadInvoiceStats(req.params.leadId);
  successResponse(res, stats, 'Invoice stats retrieved');
});

export const sendInvoiceEmailCtrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await sendInvoiceEmail(req.params.id);
  successResponse(res, result, 'Invoice sent via email');
});

export const sendInvoiceWhatsAppCtrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await sendInvoiceWhatsApp(req.params.id);
  successResponse(res, result, 'Invoice sent via WhatsApp');
});
