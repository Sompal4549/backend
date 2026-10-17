import { Router } from 'express';
import {
  createInvoiceCtrl,
  getLeadInvoices,
  getAllInvoicesCtrl,
  getInvoiceByIdCtrl,
  updateInvoiceCtrl,
  deleteInvoiceCtrl,
  getLeadInvoiceStatsCtrl,
  sendInvoiceEmailCtrl,
  sendInvoiceWhatsAppCtrl,
  createInvoiceFromOrderCtrl,
  getInvoiceHtmlCtrl,
} from '../controllers/invoice.controller';
import { Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';
import { InvoiceModel } from '../models/invoice.model';
import { ROLE } from '../constants/roles.constants';
import { errorResponse } from '../utils/api-response';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

export const invoiceRouter = Router();

const isAdmin = (req: AuthRequest) => {
  const role = (req.user as { role?: string } | undefined)?.role;
  return role === ROLE.ADMIN || role === ROLE.SUPERADMIN;
};

// Customers (leads) may only reach their own invoices; admins reach all of them
const adminOrSelf = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (isAdmin(req) || String(req.user?._id) === req.params.leadId) return next();
  errorResponse(res, 'Access denied', 403);
};

const adminOrInvoiceOwner = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (isAdmin(req)) return next();
  try {
    const invoice = await InvoiceModel.findById(req.params.id).select('lead').lean();
    if (invoice && String(invoice.lead) === String(req.user?._id)) return next();
  } catch {
    // invalid id: fall through to 404
  }
  errorResponse(res, 'Invoice not found', 404);
};

// Get all invoices (admin)
invoiceRouter.get('/', authMiddleware, adminMiddleware, getAllInvoicesCtrl);

// Get invoices for a specific lead
invoiceRouter.get('/lead/:leadId', authMiddleware, adminOrSelf, [
  param('leadId').notEmpty().withMessage('Lead ID is required'),
], validateRequest, getLeadInvoices);

// Get invoice stats for a lead
invoiceRouter.get('/lead/:leadId/stats', authMiddleware, adminOrSelf, [
  param('leadId').notEmpty().withMessage('Lead ID is required'),
], validateRequest, getLeadInvoiceStatsCtrl);

// Create invoice from order (must be before /:id routes)
invoiceRouter.post('/from-order/:orderId', authMiddleware, [
  param('orderId').notEmpty().withMessage('Order ID is required'),
], validateRequest, createInvoiceFromOrderCtrl);

// Get invoice HTML (must be before /:id routes)
invoiceRouter.get('/:id/html', authMiddleware, adminOrInvoiceOwner, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, getInvoiceHtmlCtrl);

// Get single invoice
invoiceRouter.get('/:id', authMiddleware, adminOrInvoiceOwner, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, getInvoiceByIdCtrl);

// Create invoice
invoiceRouter.post('/', authMiddleware, adminMiddleware, [
  body('lead').notEmpty().withMessage('Lead ID is required'),
  body('type').optional().isIn(['proforma', 'tax', 'credit_note', 'debit_note', 'delivery_challan']).withMessage('Invalid invoice type'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
  body('billingAddress.name').notEmpty().withMessage('Billing address name is required'),
], validateRequest, createInvoiceCtrl);

// Send invoice via email
invoiceRouter.post('/:id/send-email', authMiddleware, adminOrInvoiceOwner, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, sendInvoiceEmailCtrl);

// Send invoice via WhatsApp
invoiceRouter.post('/:id/send-whatsapp', authMiddleware, adminOrInvoiceOwner, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, sendInvoiceWhatsAppCtrl);

// Update invoice
invoiceRouter.put('/:id', authMiddleware, adminMiddleware, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, updateInvoiceCtrl);

// Delete invoice
invoiceRouter.delete('/:id', authMiddleware, adminMiddleware, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, deleteInvoiceCtrl);
