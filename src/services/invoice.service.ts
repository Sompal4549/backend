import {
  createInvoice,
  getInvoicesByLead,
  getAllInvoices,
  getInvoiceById,
  updateInvoiceById,
  deleteInvoiceById,
  getNextInvoiceNumber,
  getInvoiceStatsByLead,
} from '../repositories/invoice.repository';
import { IInvoice } from '../models/invoice.model';
import { AppError } from '../utils/app-error';
import { sendEmail } from './email.service';
import { sendWhatsAppMessage } from '../utils/whatsapp';

const TYPE_LABELS: Record<string, string> = {
  proforma: 'Proforma Invoice',
  tax: 'Tax Invoice',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  delivery_challan: 'Delivery Challan',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const buildInvoiceHtml = (inv: any) => {
  const rows = inv.items.map((item: any) =>
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #ece3d2">${item.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #ece3d2;text-align:center">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #ece3d2;text-align:right">${fmt(item.unitPrice)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #ece3d2;text-align:right">${item.gstRate}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #ece3d2;text-align:right">${fmt(item.amount)}</td>
    </tr>`
  ).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${inv.invoiceNumber}</title></head>
<body style="margin:0;font-family:Jost,Arial,sans-serif;background:#FCFAF6;color:#1F3A2A">
<div style="max-width:760px;margin:20px auto;background:#fff;border:1px solid #EDE4D3;border-radius:20px;overflow:hidden">
<div style="background:#1F3A2A;padding:32px 40px;color:#fff">
<div style="margin:0;font-size:22px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">ENSIS</div>
<p style="margin:6px 0 0;font-size:12px;color:#C7A55B;letter-spacing:.1em;text-transform:uppercase">${TYPE_LABELS[inv.type] || 'Invoice'} (${inv.invoiceNumber})</p>
</div>
<div style="padding:32px 40px">
<div style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap">
<div>
<p style="margin:0;font-size:11px;color:#8d6a3a;letter-spacing:.12em;text-transform:uppercase">Invoice No</p>
<p style="margin:4px 0 0;font-size:14px;font-weight:600">${inv.invoiceNumber}</p>
<p style="margin:14px 0 0;font-size:11px;color:#8d6a3a;letter-spacing:.12em;text-transform:uppercase">Date</p>
<p style="margin:4px 0 0;font-size:14px;font-weight:600">${new Date(inv.createdAt).toLocaleDateString('en-IN')}</p>
${inv.dueDate ? `<p style="margin:14px 0 0;font-size:11px;color:#8d6a3a;letter-spacing:.12em;text-transform:uppercase">Due Date</p>
<p style="margin:4px 0 0;font-size:14px;font-weight:600">${new Date(inv.dueDate).toLocaleDateString('en-IN')}</p>` : ''}
</div>
<div style="text-align:right">
<p style="margin:0;font-size:11px;color:#8d6a3a;letter-spacing:.12em;text-transform:uppercase">Bill To</p>
<p style="margin:4px 0 0;font-size:14px;font-weight:600">${inv.billingAddress.name}</p>
${inv.billingAddress.email ? `<p style="margin:2px 0 0;font-size:12px">${inv.billingAddress.email}</p>` : ''}
${inv.billingAddress.phone ? `<p style="margin:2px 0 0;font-size:12px">${inv.billingAddress.phone}</p>` : ''}
${inv.billingAddress.addressLine ? `<p style="margin:2px 0 0;font-size:12px">${inv.billingAddress.addressLine}</p>` : ''}
${inv.billingAddress.city ? `<p style="margin:2px 0 0;font-size:12px">${inv.billingAddress.city}, ${inv.billingAddress.state || ''} ${inv.billingAddress.postalCode || ''}</p>` : ''}
${inv.billingAddress.gstNumber ? `<p style="margin:2px 0 0;font-size:12px">GSTIN: ${inv.billingAddress.gstNumber}</p>` : ''}
</div>
</div>
<table style="width:100%;margin-top:28px;border-collapse:collapse;font-size:13px">
<thead><tr style="background:#F7F2E9">
<th style="padding:10px 12px;text-align:left">Item</th><th style="padding:10px 12px">Qty</th><th style="padding:10px 12px;text-align:right">Price</th><th style="padding:10px 12px;text-align:right">GST%</th><th style="padding:10px 12px;text-align:right">Total</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div style="margin-top:20px;text-align:right;font-size:13px">
<p style="margin:4px 0">Subtotal: <strong>${fmt(inv.subtotal)}</strong></p>
${inv.discount ? `<p style="margin:4px 0;color:#2F7D5A">Discount: - ${fmt(inv.discount)}</p>` : ''}
${inv.shipping ? `<p style="margin:4px 0">Shipping: ${fmt(inv.shipping)}</p>` : ''}
<p style="margin:4px 0">GST: <strong>${fmt(inv.tax)}</strong></p>
<p style="margin:10px 0 0;font-size:16px;border-top:1px solid #EDE4D3;padding-top:10px">Grand Total (incl. GST): <strong>${fmt(inv.totalAmount)}</strong></p>
</div>
${inv.notes ? `<p style="margin-top:20px;font-size:12px;color:#6c7068"><strong>Notes:</strong> ${inv.notes}</p>` : ''}
<p style="margin-top:28px;font-size:11px;color:#6c7068;text-align:center">Thank you for choosing ENSIS — Premium Wellness & Panchkarma Spaces.<br>This is a computer generated invoice.</p>
</div></div></body></html>`;
};

export const createNewInvoice = async (payload: Partial<IInvoice>, userId: string) => {
  if (!payload.lead) {
    throw new AppError(400, 'Lead is required');
  }
  if (!payload.items || payload.items.length === 0) {
    throw new AppError(400, 'At least one item is required');
  }

  // Calculate totals
  const items = payload.items.map((item) => {
    const amount = item.quantity * item.unitPrice;
    return { ...item, amount };
  });
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = items.reduce((sum, item) => sum + (item.amount * item.gstRate) / 100, 0);
  const discount = payload.discount || 0;
  const shipping = payload.shipping || 0;
  const totalAmount = Math.max(0, subtotal + tax - discount + shipping);

  const invoiceNumber = await getNextInvoiceNumber(payload.type || 'tax');

  const invoice = await createInvoice({
    ...payload,
    items,
    subtotal,
    tax,
    totalAmount,
    invoiceNumber,
    createdBy: userId as any,
  } as any);

  return invoice;
};

export const fetchLeadInvoices = async (leadId: string, page?: number, limit?: number) => {
  return getInvoicesByLead(leadId, page, limit);
};

export const fetchAllInvoices = async (page?: number, limit?: number, filters?: { type?: string; status?: string; search?: string }) => {
  return getAllInvoices(page, limit, filters);
};

export const fetchInvoice = async (id: string) => {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }
  return invoice;
};

export const updateInvoice = async (id: string, payload: Partial<IInvoice>) => {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  // Recalculate if items changed
  if (payload.items && payload.items.length > 0) {
    const items = payload.items.map((item) => {
      const amount = item.quantity * item.unitPrice;
      return { ...item, amount };
    });
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = items.reduce((sum, item) => sum + (item.amount * item.gstRate) / 100, 0);
    const discount = payload.discount ?? (invoice.discount || 0);
    const shipping = payload.shipping ?? (invoice.shipping || 0);
    const totalAmount = Math.max(0, subtotal + tax - discount + shipping);

    payload.items = items as any;
    payload.subtotal = subtotal;
    payload.tax = tax;
    payload.totalAmount = totalAmount;
  }

  return updateInvoiceById(id, payload);
};

export const removeInvoice = async (id: string) => {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }
  return deleteInvoiceById(id);
};

export const fetchLeadInvoiceStats = async (leadId: string) => {
  return getInvoiceStatsByLead(leadId);
};

export const sendInvoiceEmail = async (invoiceId: string) => {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new AppError(404, 'Invoice not found');

  const lead = invoice.lead as any;
  const email = lead?.email || invoice.billingAddress?.email;
  if (!email) throw new AppError(400, 'No email address found for this lead');

  const html = buildInvoiceHtml(invoice);
  const subject = `${TYPE_LABELS[invoice.type] || 'Invoice'} ${invoice.invoiceNumber} - ENSIS Wellness`;

  await sendEmail(email, subject, `Please find your ${TYPE_LABELS[invoice.type] || 'invoice'} ${invoice.invoiceNumber} attached.`, html);

  // Update status to sent if draft
  if (invoice.status === 'draft') {
    await updateInvoiceById(invoiceId, { status: 'sent' });
  }

  return { success: true, message: `Invoice sent to ${email}` };
};

export const sendInvoiceWhatsApp = async (invoiceId: string) => {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new AppError(404, 'Invoice not found');

  const lead = invoice.lead as any;
  const phone = lead?.phone || invoice.billingAddress?.phone;
  if (!phone) throw new AppError(400, 'No phone number found for this lead');

  const leadName = lead ? `${lead.firstName} ${lead.lastName}` : 'Customer';
  const msg = `Hello ${leadName},\n\nPlease find your *${TYPE_LABELS[invoice.type] || 'Invoice'}* (${invoice.invoiceNumber}) from ENSIS Wellness.\n\n*Amount: ${fmt(invoice.totalAmount)}*\n*Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}*\n\nPlease review and let us know if you have any questions.\n\n Regards,\nEnsis Wellness`;

  const phoneStr = String(phone).replace(/\D/g, '');
  const normalizedPhone = phoneStr.startsWith('91') && phoneStr.length === 12
    ? phoneStr
    : phoneStr.length === 10
      ? `91${phoneStr}`
      : phoneStr;

  console.log('[WhatsApp] Sending to:', normalizedPhone, 'Phone raw:', phone);
  const result = await sendWhatsAppMessage(normalizedPhone, msg, leadName);
  console.log('[WhatsApp] Result:', JSON.stringify(result));

  if (!result.success) {
    throw new AppError(500, `WhatsApp failed: ${(result as any).error || 'Unknown error'}`);
  }

  // Update status to sent if draft
  if (invoice.status === 'draft') {
    await updateInvoiceById(invoiceId, { status: 'sent' });
  }

  return { success: true, message: `Invoice sent via WhatsApp to ${normalizedPhone}` };
};
