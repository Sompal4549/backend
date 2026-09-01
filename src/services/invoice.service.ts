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
import { OrderModel } from '../models/order.model';
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

const SITE_URL = process.env.SITE_URL || 'http://localhost:3001';

const buildInvoiceHtml = (inv: any) => {
  const billAddr = inv.billingAddress || {};
  const shipAddr = inv.shippingAddress || {};
  const items = inv.items || [];
  const invDate = new Date(inv.createdAt).toLocaleDateString('en-IN');
  const invTime = new Date(inv.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const taxableValue = inv.subtotal || 0;
  const tax = inv.tax || 0;
  const totalAmount = inv.totalAmount || 0;

  const amountInWords = (n: number): string => {
    if (n === 0) return 'Zero Rupees Only';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const convert = (num: number): string => {
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + convert(num % 100) : '');
      if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
      if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
      return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
    };
    return convert(Math.floor(n)) + ' Rupees Only';
  };

  const itemRows = items.map((item: any, idx: number) => {
    const qty = item.quantity || 0;
    const rate = item.unitPrice || 0;
    const amount = item.amount || qty * rate;
    const disc = item.discount || 0;
    const total = amount - disc;
    return `<tr>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;font-size:10px">${idx + 1}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;font-size:10px"><strong>${item.name || ''}</strong>${item.description ? `<br/><span style="font-size:9px;color:#6b7280">${item.description}</span>` : ''}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${item.hsn || '-'}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${qty}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${item.size || '-'}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${item.area || '-'}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${item.unit || 'Nos'}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:10px">${fmt(rate)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:10px">${disc > 0 ? disc + '%' : '0%'}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-size:10px">${fmt(total)}</td>
    </tr>`;
  }).join('');

  const taxRows = items.map((item: any, idx: number) => {
    const qty = item.quantity || 0;
    const amount = item.amount || 0;
    const gstRate = item.gstRate || 18;
    const cgst = gstRate / 2;
    const sgst = gstRate / 2;
    const cgstAmt = (amount * cgst) / 100;
    const sgstAmt = (amount * sgst) / 100;
    const totalTax = cgstAmt + sgstAmt;
    return `<tr>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;font-size:10px">${idx + 1}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${item.hsn || '-'}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${item.sac || '-'}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:10px">${fmt(amount)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${qty}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${cgst}%</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:10px">${fmt(cgstAmt)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">${sgst}%</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:10px">${fmt(sgstAmt)}</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:10px">-</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:10px">-</td>
      <td style="padding:4px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;font-size:10px">${fmt(totalTax)}</td>
    </tr>`;
  }).join('');

  const companyName = 'Design House India Pvt. Ltd.';
  const brandName = 'ENSIS';
  const phone1 = '+91 9654900525';
  const emailAddr = 'info@ensis.in';
  const website = 'www.ensis.in';
  const gstin = '';
  const cin = '';
  const address = '12/29, Site-II, Loni Road, Industrial Area, Mohan Nagar - 201007, Uttar Pradesh, India';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${inv.invoiceNumber}</title>
<style>
  body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#1a1a1a;background:#fff}
</style></head><body>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:800px;margin:0 auto;background:#fff">
  <!-- HEADER -->
  <tr>
    <td style="background:#1a3a5c;padding:12px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="33%" valign="middle" style="border-right:1px solid rgba(255,255,255,0.2);padding-right:12px">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td valign="middle" style="padding-right:10px">
                <img src="${SITE_URL}/images/ensis-logo.png" alt="Logo" width="44" height="44" style="background:#fff;border-radius:6px;padding:3px;display:block" />
              </td>
              <td valign="middle" style="color:#fff;font-size:10px;line-height:1.5">
                <div style="font-weight:600;font-size:12px;color:#fff">${brandName}</div>
                <div style="color:#fff">${phone1}</div>
                <div style="color:#fff">${emailAddr}</div>
              </td>
            </tr></table>
          </td>
          <td width="34%" valign="middle" style="border-right:1px solid rgba(255,255,255,0.2);padding:0 12px">
            <div style="color:#fff;font-size:10px;line-height:1.5">
              <div>${website}</div>
              <div>${emailAddr}</div>
              <div>${phone1}</div>
              ${gstin ? `<div>GSTIN - ${gstin}</div>` : ''}
              ${cin ? `<div>CIN No. ${cin}</div>` : ''}
            </div>
          </td>
          <td width="33%" valign="middle" style="text-align:right;padding-left:12px">
            <div style="color:#fff;font-size:10px;line-height:1.5">
              <div style="font-weight:600;margin-bottom:4px">Head Office:</div>
              <div>${address}</div>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- TITLE -->
  <tr>
    <td style="text-align:center;padding:10px;border-bottom:2px solid #1a3a5c">
      <span style="font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#1a3a5c;font-weight:bold">${TYPE_LABELS[inv.type] || 'Tax Invoice'}</span>
    </td>
  </tr>

  <!-- INFO GRID -->
  <tr>
    <td style="border-bottom:1px solid #e5e7eb">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <!-- CLIENT -->
          <td width="33%" valign="top" style="padding:10px 12px;border-right:1px solid #e5e7eb">
            <div style="background:#1a3a5c;color:#fff;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 6px;margin-bottom:6px">Client Name &amp; Address</div>
            <div style="font-size:10px;line-height:1.6">
              <div><strong>${billAddr.name || '-'}</strong></div>
              ${billAddr.addressLine ? `<div>${billAddr.addressLine}</div>` : ''}
              ${billAddr.city ? `<div>${billAddr.city}, ${billAddr.state || ''} ${billAddr.postalCode || ''}</div>` : ''}
              ${billAddr.country ? `<div>${billAddr.country}</div>` : ''}
              <div>Contact Person : ${billAddr.name || '-'}</div>
              ${billAddr.phone ? `<div>Contact No. : ${billAddr.phone}</div>` : ''}
              ${billAddr.email ? `<div>Email : ${billAddr.email}</div>` : ''}
            </div>
          </td>
          <!-- SHIPMENT -->
          <td width="34%" valign="top" style="padding:10px 12px;border-right:1px solid #e5e7eb">
            <div style="background:#1a3a5c;color:#fff;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 6px;margin-bottom:6px">Shipment Details</div>
            <div style="font-size:10px;line-height:1.6">
              <div><strong>${shipAddr.name || billAddr.name || '-'}</strong></div>
              ${shipAddr.addressLine ? `<div>${shipAddr.addressLine}</div>` : ''}
              ${shipAddr.city ? `<div>${shipAddr.city}, ${shipAddr.state || ''} ${shipAddr.postalCode || ''}</div>` : ''}
              <div>Contact Person : ${shipAddr.name || '-'}</div>
              ${shipAddr.phone ? `<div>Contact No. : ${shipAddr.phone}</div>` : ''}
              ${shipAddr.email ? `<div>Email : ${shipAddr.email}</div>` : ''}
              ${shipAddr.gstNumber ? `<div>GSTIN / UIN : ${shipAddr.gstNumber}</div>` : ''}
            </div>
          </td>
          <!-- DETAILS -->
          <td width="33%" valign="top" style="padding:10px 12px">
            <div style="background:#1a3a5c;color:#fff;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 6px;margin-bottom:6px;text-align:right">Invoice Details</div>
            <div style="font-size:10px;line-height:1.8">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td>Invoice No. :</td><td style="text-align:right"><strong>${inv.invoiceNumber}</strong></td></tr>
                <tr><td>Invoice Date :</td><td style="text-align:right">${invDate}</td></tr>
                ${inv.dueDate ? `<tr><td>Due Date :</td><td style="text-align:right">${new Date(inv.dueDate).toLocaleDateString('en-IN')}</td></tr>` : ''}
                <tr><td>Created Date :</td><td style="text-align:right">${invDate}</td></tr>
                <tr><td>Created Time :</td><td style="text-align:right">${invTime}</td></tr>
              </table>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ITEMS TABLE -->
  <tr>
    <td style="padding:10px 12px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:10px;border-collapse:collapse">
        <thead>
          <tr style="background:#1a3a5c;color:#fff">
            <th style="padding:5px 6px;text-align:left;font-size:9px;color:#fff">S.NO.</th>
            <th style="padding:5px 6px;text-align:left;font-size:9px;color:#fff">ITEM DESCRIPTION</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">HSN/SAC CODE</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">QTY.</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">SIZE</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">AREA</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">UNIT</th>
            <th style="padding:5px 6px;text-align:right;font-size:9px;color:#fff">RATE</th>
            <th style="padding:5px 6px;text-align:right;font-size:9px;color:#fff">DISCOUNT</th>
            <th style="padding:5px 6px;text-align:right;font-size:9px;color:#fff">TOTAL</th>
          </tr>
        </thead>
        <tbody>${itemRows || '<tr><td colspan="10" style="text-align:center;padding:10px;color:#9ca3af;font-size:10px">No items</td></tr>'}</tbody>
      </table>
    </td>
  </tr>

  <!-- TAX TABLE -->
  <tr>
    <td style="padding:0 12px 10px 12px">
      <div style="text-align:right;font-size:10px;margin-bottom:6px"><strong>TAXABLE VALUE : ${fmt(taxableValue)}</strong></div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:10px;border-collapse:collapse">
        <thead>
          <tr style="background:#1a3a5c;color:#fff">
            <th style="padding:5px 6px;text-align:left;font-size:9px;color:#fff">S.NO.</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">HSN CODE</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">SAC CODE</th>
            <th style="padding:5px 6px;text-align:right;font-size:9px;color:#fff">ITEM VALUE</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">QTY.</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">CGST(%)</th>
            <th style="padding:5px 6px;text-align:right;font-size:9px;color:#fff">AMOUNT</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">SGST(%)</th>
            <th style="padding:5px 6px;text-align:right;font-size:9px;color:#fff">AMOUNT</th>
            <th style="padding:5px 6px;text-align:center;font-size:9px;color:#fff">IGST(%)</th>
            <th style="padding:5px 6px;text-align:right;font-size:9px;color:#fff">AMOUNT</th>
            <th style="padding:5px 6px;text-align:right;font-size:9px;color:#fff">TOTAL TAX</th>
          </tr>
        </thead>
        <tbody>${taxRows}</tbody>
      </table>
      <!-- Totals -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;font-size:10px">
        <tr><td style="padding:2px 0">GST AMOUNT IN WORDS (INR)</td><td style="text-align:right;padding:2px 0">${amountInWords(tax)}</td></tr>
        <tr><td style="padding:2px 0;font-weight:600">TOTAL GST AMT</td><td style="text-align:right;padding:2px 0;font-weight:600">${fmt(tax)}</td></tr>
        <tr><td style="padding:2px 0">AMOUNT IN WORDS (INR)</td><td style="text-align:right;padding:2px 0">${amountInWords(totalAmount)}</td></tr>
        <tr><td style="padding:6px 0 2px 0;border-top:2px solid #1a3a5c;font-size:13px;font-weight:700">GRAND TOTAL</td><td style="text-align:right;padding:6px 0 2px 0;border-top:2px solid #1a3a5c;font-size:13px;font-weight:700">${fmt(totalAmount)}</td></tr>
      </table>
    </td>
  </tr>

  <!-- TERMS -->
  <tr>
    <td style="padding:0 12px;border-top:1px solid #e5e7eb">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="49%" valign="top" style="padding:10px 0">
            <table width="100%" cellpadding="8" cellspacing="0" border="1" bordercolor="#e5e7eb" style="border-collapse:collapse;font-size:9px">
              <tr><td>
                <div style="font-weight:700;font-size:10px;margin-bottom:4px">Terms &amp; Conditions:</div>
                <ol style="padding-left:14px;margin:0;line-height:1.7">
                  <li>Payment must be made in favor of ${companyName} via Cheque / DD / RTGS / NEFT / UPI only.</li>
                  <li>Delay in payment shall attract interest @24% per annum.</li>
                  <li>Booking / services shall be confirmed only after receipt of payment.</li>
                  <li>Cancellation or amendments shall be subject to company policy and management approval.</li>
                  <li>All disputes are subject to Delhi Jurisdiction only.</li>
                  <li>Full payment is due within the stipulated invoice period.</li>
                </ol>
              </td></tr>
            </table>
          </td>
          <td width="2%"></td>
          <td width="49%" valign="top" style="padding:10px 0">
            <table width="100%" cellpadding="8" cellspacing="0" border="1" bordercolor="#e5e7eb" style="border-collapse:collapse;font-size:9px">
              <tr><td>
                <div style="font-weight:700;font-size:10px;margin-bottom:4px">Payment &amp; Term Conditions:</div>
                <ol style="padding-left:14px;margin:0;line-height:1.7">
                  <li>Advance Payment - 100%: Full payment is payable in advance on the same day of Invoice generation.</li>
                  <li>TDS under Section 194C shall be deducted on the basic value only (excluding GST). Applicable rate: 2% for Companies/Firms/other entities and 1% for Individual/HUF.</li>
                  <li>Please share the applicable TDS Certificate (Form 16A) after deduction.</li>
                </ol>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- BOTTOM 3-COL -->
  <tr>
    <td style="padding:0 12px 10px 12px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <!-- BANK -->
          <td width="33%" valign="top" style="padding-right:6px">
            <table width="100%" cellpadding="8" cellspacing="0" border="1" bordercolor="#e5e7eb" style="border-collapse:collapse;font-size:10px">
              <tr><td>
                <div style="font-weight:700;margin-bottom:4px">${brandName} BANK DETAILS</div>
                <div>Bank Name : ${inv.bankDetails?.bankName || '--'}</div>
                <div>Account Name : ${inv.bankDetails?.accountName || '--'}</div>
                <div>Account No. : ${inv.bankDetails?.accountNo || '--'}</div>
                <div>IFSC Code : ${inv.bankDetails?.ifsc || '--'}</div>
                <div>Branch Name : ${inv.bankDetails?.branch || '--'}</div>
              </td></tr>
            </table>
          </td>
          <!-- ACK -->
          <td width="34%" valign="top" style="padding:0 3px">
            <table width="100%" cellpadding="8" cellspacing="0" border="1" bordercolor="#e5e7eb" style="border-collapse:collapse;font-size:10px">
              <tr><td>
                <div style="font-weight:700;margin-bottom:4px">RECEIVER'S ACKNOWLEDGEMENT</div>
                <div>Received the above goods / services in good condition.</div>
                <div style="margin-top:36px;border-top:1px dashed #d1d5db;padding-top:6px;text-align:center;color:#9ca3af;font-size:9px">(Signature &amp; Company Seal)</div>
              </td></tr>
            </table>
          </td>
          <!-- SIGNATORY -->
          <td width="33%" valign="top" style="padding-left:6px">
            <table width="100%" cellpadding="8" cellspacing="0" border="1" bordercolor="#e5e7eb" style="border-collapse:collapse;font-size:10px">
              <tr><td>
                <div style="font-weight:700;margin-bottom:4px">FOR ${brandName}</div>
                <div style="margin-top:36px;border-top:1px dashed #d1d5db;padding-top:6px;text-align:center;color:#9ca3af;font-size:9px">Authorized Signatory.</div>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#1a3a5c;color:#fff;text-align:center;padding:8px;font-size:9px">
      This is a computer generated document and does not require a physical signature.
    </td>
  </tr>
</table>
</body></html>`;
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

export const createInvoiceFromOrder = async (orderId: string, leadId: string) => {
  const order = await OrderModel.findById(orderId).populate('items.product', 'title');
  if (!order) {
    throw new AppError(404, 'Order not found');
  }

  // Verify the order belongs to this lead
  if (String(order.user) !== leadId) {
    throw new AppError(403, 'Unauthorized access to this order');
  }

  // Check if invoice already exists for this order
  const existingInvoice = await (await import('../models/invoice.model')).InvoiceModel.findOne({ order: order._id })
    .populate('lead', 'firstName lastName email phone companyName phoneCode addressLine city state country zipCode')
    .populate('order')
    .populate('items.product', 'title slug images')
    .populate('createdBy', 'name');

  if (existingInvoice) {
    return existingInvoice;
  }

  // Map order items to invoice items
  const items = order.items.map((item: any) => {
    const productName = item.name || (typeof item.product === 'object' ? item.product?.title : 'Product');
    const gstRate = item.gstRate ?? 5;
    const unitPrice = item.price;
    const amount = unitPrice * item.quantity;
    return {
      product: typeof item.product === 'object' ? item.product?._id : item.product,
      name: productName,
      quantity: item.quantity,
      unitPrice,
      gstRate,
      amount,
    };
  });

  const subtotal = items.reduce((sum: number, item: any) => sum + item.amount, 0);
  const tax = items.reduce((sum: number, item: any) => sum + (item.amount * item.gstRate) / 100, 0);
  const discount = (order.discount || 0) + (order.couponDiscount || 0);
  const shipping = order.shipping || 0;
  const totalAmount = order.totalAmount;

  const invoiceNumber = await getNextInvoiceNumber('tax');

  // Build billing address from shipping address
  const shippingAddr = order.shippingAddress;
  const billingAddress = {
    name: shippingAddr.label || 'Customer',
    phone: shippingAddr.phone || '',
    addressLine: shippingAddr.street,
    city: shippingAddr.city,
    state: shippingAddr.state,
    postalCode: shippingAddr.postalCode,
    country: shippingAddr.country,
  };

  const invoice = await createInvoice({
    invoiceNumber,
    type: 'tax',
    lead: leadId as any,
    order: order._id,
    items,
    billingAddress,
    subtotal,
    discount,
    tax,
    shipping,
    totalAmount,
    status: order.paymentStatus === 'paid' ? 'sent' : 'draft',
    paymentReceived: order.paymentStatus === 'paid' ? totalAmount : 0,
    paymentDate: order.paymentStatus === 'paid' ? new Date() : undefined,
  } as any);

  // Populate the invoice before returning
  const populatedInvoice = await getInvoiceById(String(invoice._id));
  return populatedInvoice || invoice;
};

export const getInvoiceHtml = async (invoiceId: string) => {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }
  return buildInvoiceHtml(invoice);
};
