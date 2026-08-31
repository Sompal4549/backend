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
} from '../controllers/invoice.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../middlewares/validate.middleware';

export const invoiceRouter = Router();

// Get all invoices (admin)
invoiceRouter.get('/', authMiddleware, getAllInvoicesCtrl);

// Get invoices for a specific lead
invoiceRouter.get('/lead/:leadId', authMiddleware, [
  param('leadId').notEmpty().withMessage('Lead ID is required'),
], validateRequest, getLeadInvoices);

// Get invoice stats for a lead
invoiceRouter.get('/lead/:leadId/stats', authMiddleware, [
  param('leadId').notEmpty().withMessage('Lead ID is required'),
], validateRequest, getLeadInvoiceStatsCtrl);

// Get single invoice
invoiceRouter.get('/:id', authMiddleware, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, getInvoiceByIdCtrl);

// Create invoice
invoiceRouter.post('/', authMiddleware, [
  body('lead').notEmpty().withMessage('Lead ID is required'),
  body('type').optional().isIn(['proforma', 'tax', 'credit_note', 'debit_note', 'delivery_challan']).withMessage('Invalid invoice type'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Valid quantity is required'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
  body('billingAddress.name').notEmpty().withMessage('Billing address name is required'),
], validateRequest, createInvoiceCtrl);

// Send invoice via email
invoiceRouter.post('/:id/send-email', authMiddleware, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, sendInvoiceEmailCtrl);

// Send invoice via WhatsApp
invoiceRouter.post('/:id/send-whatsapp', authMiddleware, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, sendInvoiceWhatsAppCtrl);

// Update invoice
invoiceRouter.put('/:id', authMiddleware, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, updateInvoiceCtrl);

// Delete invoice
invoiceRouter.delete('/:id', authMiddleware, [
  param('id').notEmpty().withMessage('Invoice ID is required'),
], validateRequest, deleteInvoiceCtrl);
