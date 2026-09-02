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
  proforma: 'Estimate',
  tax: 'Tax Invoice',
  credit_note: 'Credit Note',
  debit_note: 'Debit Note',
  delivery_challan: 'Delivery Challan',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const buildInvoiceHtml = (inv: any) => {
  const isEstimate = inv.type === 'proforma';
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

  const bdr = 'border:1px solid #d1d5db';
  const minRows = 7;
  const emptyCount = Math.max(0, minRows - items.length);

  let itemRows = items.map((item: any, idx: number) => {
    const qty = item.quantity || 0;
    const rate = item.unitPrice || 0;
    const amount = item.amount || qty * rate;
    const disc = item.discount || 0;
    const total = amount - disc;
    return `<tr>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${idx + 1}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px"><span style="font-weight:600">${item.name || ''}</span>${item.description ? `<br/><span style="font-size:9px;color:#6b7280">${item.description}</span>` : ''}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${item.hsn || '-'}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${qty}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${item.size || '-'}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${item.area || '-'}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${item.unit || 'Nos'}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${fmt(rate)}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${disc > 0 ? disc + '%' : '0%'}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-weight:600;font-size:9px">${fmt(total)}</td>
    </tr>`;
  }).join('');

  for (let i = 0; i < emptyCount; i++) {
    itemRows += `<tr>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
      <td style="${bdr};padding:5px 4px;height:20px;font-size:9px">&nbsp;</td>
    </tr>`;
  }

  // Add Taxable Value row inside items table
  itemRows += `<tr style="background-color:#f9fafb">
    <td colspan="9" style="${bdr};padding:5px 8px;text-align:right;font-size:9px;font-weight:bold;color:#374151">TAXABLE VALUE :</td>
    <td style="${bdr};padding:5px 6px;text-align:center;font-size:10px;font-weight:bold;color:#111827">${fmt(taxableValue)}</td>
  </tr>`;

  let taxRows = items.map((item: any, idx: number) => {
    const qty = item.quantity || 0;
    const amount = item.amount || 0;
    const gstRate = item.gstRate || 18;
    const cgst = gstRate / 2;
    const sgst = gstRate / 2;
    const cgstAmt = (amount * cgst) / 100;
    const sgstAmt = (amount * sgst) / 100;
    const totalTax = cgstAmt + sgstAmt;
    return `<tr>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${idx + 1}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${item.hsn || '-'}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${item.sac || '-'}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${fmt(amount)}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${qty}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${cgst}%</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${fmt(cgstAmt)}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${sgst}%</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">${fmt(sgstAmt)}</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">-</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-size:9px">-</td>
      <td style="${bdr};padding:5px 4px;text-align:center;font-weight:600;font-size:9px">${fmt(totalTax)}</td>
    </tr>`;
  }).join('');

  const companyName = 'Design House India Pvt. Ltd.';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${inv.invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#1a1a1a;-webkit-text-size-adjust:none">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:20px 0;width:100%!important;margin:0">
  <tr>
    <td align="center" style="padding:0 10px">
      <!-- White Document Card with padding around header, tables, footer -->
      <table width="780" cellpadding="0" cellspacing="0" border="0" style="max-width:780px;width:100%;background-color:#ffffff;border:1px solid #d1d5db;border-radius:6px;border-collapse:collapse;margin:0 auto">
        <tr>
          <td style="padding:16px 18px 20px 18px;background-color:#ffffff">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%">
              
              <!-- HEADER -->
              <tr>
                <td style="padding:0;text-align:center">
                  <img src="https://res.cloudinary.com/ddjhixcwh/image/upload/v1788345967/ensis/home/x4jc41aedar9iiaujo9j.webp" alt="Ensis Header" style="width:100%;max-width:780px;height:auto;display:block;border:0" />
                </td>
              </tr>

              <!-- TITLE BAR (COMPACT PADDING) -->
              <tr>
                <td style="text-align:center;padding:2px 0 3px 0;border-bottom:2px solid #1a3a5c;background-color:#ffffff">
                  <h2 style="margin:0;font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#1a3a5c;font-weight:bold;line-height:1.2">${TYPE_LABELS[inv.type] || (isEstimate ? 'Estimate' : 'Tax Invoice')}</h2>
                </td>
              </tr>

              <!-- INFO GRID (CLIENT / SHIPMENT / DETAILS - FLUSH 3 COLS) -->
              <tr>
                <td style="padding:0;background-color:#ffffff">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #d1d5db;width:100%">
                    <tr>
                      <!-- Client -->
                      <td width="33.33%" valign="top" style="padding:6px 8px;border-right:1px solid #d1d5db;font-size:9px;line-height:1.4">
                        <div style="background-color:#1a3a5c;color:#ffffff;font-size:8px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:2px 6px;margin:-6px -8px 6px -8px">Client Name &amp; Address</div>
                        <p style="margin:0 0 2px 0;font-weight:bold;font-size:9px;color:#1a1a1a">${billAddr.name || "-"}</p>
                        ${billAddr.addressLine ? `<p style="margin:0 0 2px 0;font-size:9px;color:#1a1a1a">${billAddr.addressLine}</p>` : ""}
                        ${billAddr.city ? `<p style="margin:0 0 2px 0;font-size:9px;color:#1a1a1a">${billAddr.city}, ${billAddr.state || ""} ${billAddr.postalCode || ""}</p>` : ""}
                        ${billAddr.country ? `<p style="margin:0 0 2px 0;font-size:9px;color:#1a1a1a">${billAddr.country}</p>` : ""}
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:9px;border-collapse:collapse;width:100%">
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap;width:100px">Contact Person</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${billAddr.name || "-"}</td></tr>
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">Contact No.</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${billAddr.phone || "--"}</td></tr>
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">Email</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${billAddr.email || "--"}</td></tr>
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">GSTIN / UIN</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${billAddr.gstNumber || "--"}</td></tr>
                        </table>
                      </td>
                      <!-- Shipment -->
                      <td width="33.33%" valign="top" style="padding:6px 8px;border-right:1px solid #d1d5db;font-size:9px;line-height:1.4">
                        <div style="background-color:#1a3a5c;color:#ffffff;font-size:8px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:2px 6px;margin:-6px -8px 6px -8px">Shipment Details</div>
                        <p style="margin:0 0 2px 0;font-weight:bold;font-size:9px;color:#1a1a1a">${shipAddr.name || billAddr.name || "-"}</p>
                        ${shipAddr.addressLine ? `<p style="margin:0 0 2px 0;font-size:9px;color:#1a1a1a">${shipAddr.addressLine}</p>` : ""}
                        ${shipAddr.city ? `<p style="margin:0 0 2px 0;font-size:9px;color:#1a1a1a">${shipAddr.city}, ${shipAddr.state || ""} ${shipAddr.postalCode || ""}</p>` : ""}
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:9px;border-collapse:collapse;width:100%">
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap;width:100px">Contact Person</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${shipAddr.name || billAddr.name || "-"}</td></tr>
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">Contact No.</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${shipAddr.phone || billAddr.phone || "--"}</td></tr>
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">Email</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${shipAddr.email || billAddr.email || "--"}</td></tr>
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">GSTIN / UIN</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${shipAddr.gstNumber || "--"}</td></tr>
                        </table>
                      </td>
                      <!-- Details -->
                      <td width="33.34%" valign="top" style="padding:6px 8px;font-size:9px;line-height:1.4">
                        <div style="background-color:#1a3a5c;color:#ffffff;font-size:8px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:2px 6px;margin:-6px -8px 6px -8px;text-align:right">${isEstimate ? 'Estimate' : 'Invoice'} Details</div>
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:9px;border-collapse:collapse;width:100%">
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap;width:100px">${isEstimate ? 'Estimate No.' : 'Invoice No.'}</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${inv.invoiceNumber}</td></tr>
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">${isEstimate ? 'Estimate Date' : 'Invoice Date'}</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${invDate}</td></tr>
                          ${inv.dueDate ? `<tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">Due Date</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${new Date(inv.dueDate).toLocaleDateString('en-IN')}</td></tr>` : `<tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">Supply Date</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${invDate}</td></tr>`}
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">Created Date</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${invDate}</td></tr>
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">Created Time</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${invTime}</td></tr>
                          <tr><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a;font-weight:600;white-space:nowrap">Created By</td><td style="border:none;padding:1px 0;font-size:9px;color:#1a1a1a">: ${inv.createdBy?.name || "--"}</td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- ITEMS TABLE -->
              <tr>
                <td style="padding-top:8px;background-color:#ffffff">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #d1d5db;font-size:9px;width:100%">
                    <thead>
                      <tr style="background-color:#1a3a5c;color:#ffffff">
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:left;font-size:9px;color:#ffffff;font-weight:bold;height:24px">S.NO.</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:left;font-size:9px;color:#ffffff;font-weight:bold;height:24px">ITEM DESCRIPTION</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">HSN/SAC CODE</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">QTY.</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">SIZE</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">AREA</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">UNIT</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">RATE</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">DISCOUNT</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>${itemRows}</tbody>
                  </table>
                </td>
              </tr>

              <!-- TAX BREAKDOWN & TOTALS -->
              <tr>
                <td style="padding-top:6px;background-color:#ffffff">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #d1d5db;font-size:9px;width:100%">
                    <thead>
                      <tr style="background-color:#1a3a5c;color:#ffffff">
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:left;font-size:9px;color:#ffffff;font-weight:bold;height:24px">S.NO.</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">HSN CODE</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">SAC CODE</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">ITEM VALUE</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">QTY.</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">CGST(%)</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">AMOUNT</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">SGST(%)</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">AMOUNT</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">IGST(%)</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">AMOUNT</th>
                        <th style="border:1px solid #d1d5db;padding:5px 4px;text-align:center;font-size:9px;color:#ffffff;font-weight:bold;height:24px">TOTAL TAX</th>
                      </tr>
                    </thead>
                    <tbody>${taxRows}</tbody>
                  </table>

                  <!-- Totals Table -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;border-collapse:collapse;border:1px solid #d1d5db;font-size:9px;width:100%">
                    <tr>
                      <td style="border:1px solid #d1d5db;padding:4px 6px;width:25%;font-weight:bold;color:#1a1a1a">GST AMOUNT IN WORDS (INR)</td>
                      <td style="border:1px solid #d1d5db;padding:4px 6px;width:45%;text-align:center;color:#1a1a1a">${amountInWords(tax)}</td>
                      <td style="border:1px solid #d1d5db;padding:4px 6px;width:15%;font-weight:bold;color:#1a1a1a">TOTAL GST AMT</td>
                      <td style="border:1px solid #d1d5db;padding:4px 6px;width:15%;text-align:center;font-weight:bold;color:#1a1a1a">${fmt(tax)}</td>
                    </tr>
                    <tr>
                      <td style="border:1px solid #d1d5db;padding:4px 6px;font-weight:bold;color:#1a1a1a">AMOUNT IN WORDS (INR)</td>
                      <td style="border:1px solid #d1d5db;padding:4px 6px;text-align:center;color:#1a1a1a">${amountInWords(totalAmount)}</td>
                      <td style="border:2px solid #1a3a5c;padding:4px 6px;text-align:center;font-size:12px;font-weight:600;background-color:#f0f4f8">GRAND TOTAL</td>
                      <td style="border:2px solid #1a3a5c;padding:4px 6px;text-align:center;font-size:12px;font-weight:600;background-color:#f0f4f8">${fmt(totalAmount)}</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- TERMS AND CONDITIONS -->
              <tr>
                <td style="padding-top:4px;background-color:#ffffff">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #d1d5db;font-size:9px;width:100%">
                    <tr>
                      <th width="50%" style="border:1px solid #d1d5db;background-color:#f0f4f8;color:#1a1a1a;padding:4px 6px;text-align:center;font-weight:bold;font-size:9px">Terms and Conditions:</th>
                      <th width="50%" style="border:1px solid #d1d5db;background-color:#f0f4f8;color:#1a1a1a;padding:4px 6px;text-align:center;font-weight:bold;font-size:9px">Payment &amp; Term Conditions:</th>
                    </tr>
                    <tr>
                      <td width="50%" valign="top" style="padding:8px;border-right:1px solid #d1d5db;font-size:9px;line-height:1.5;color:#1a1a1a">
                        <ol style="padding-left:14px;margin:0;line-height:1.6">
                          <li>Payment must be made in favor of ${companyName} via Cheque / DD / RTGS / NEFT / UPI only.</li>
                          <li>Delay in payment shall attract interest @24% per annum.</li>
                          <li>Booking / services shall be confirmed only after receipt of payment.</li>
                          <li>Cancellation or amendments shall be subject to company policy and management approval.</li>
                          <li>All disputes are subject to Delhi Jurisdiction only.</li>
                          <li>Full payment is due within the stipulated invoice period.</li>
                        </ol>
                      </td>
                      <td width="50%" valign="top" style="padding:8px;font-size:9px;line-height:1.5;color:#1a1a1a">
                        <ol style="padding-left:14px;margin:0;line-height:1.6">
                          <li>Advance Payment - 100%: Full payment is payable in advance on the same day of ${isEstimate ? 'Estimate' : 'Invoice'} generation.</li>
                          <li>TDS under Section 194C shall be deducted on the basic value only (excluding GST). Applicable rate: 2% for Companies/Firms/other entities and 1% for Individual/HUF.</li>
                          <li>Please share the applicable TDS Certificate (Form 16A) after deduction.</li>
                        </ol>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- BANK DETAILS / ACKNOWLEDGEMENT / SIGNATURE -->
              <tr>
                <td style="padding-top:8px;background-color:#ffffff">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #d1d5db;font-size:9px;width:100%">
                    <tr>
                      <th width="33.33%" style="border:1px solid #d1d5db;background-color:#f0f4f8;color:#1a1a1a;padding:4px 6px;text-align:center;font-weight:bold;font-size:9px">Design House India BANK DETAILS</th>
                      <th width="33.34%" style="border:1px solid #d1d5db;background-color:#f0f4f8;color:#1a1a1a;padding:4px 6px;text-align:center;font-weight:bold;font-size:9px">RECEIVER'S ACKNOWLEDGEMENT</th>
                      <th width="33.33%" style="border:1px solid #d1d5db;background-color:#f0f4f8;color:#1a1a1a;padding:4px 6px;text-align:center;font-weight:bold;font-size:9px">FOR Design House India</th>
                    </tr>
                    <tr>
                      <td width="33.33%" valign="top" style="padding:8px;border-right:1px solid #d1d5db;font-size:9px;line-height:1.5;color:#1a1a1a">
                        <div>Bank Name : ${inv.bankDetails?.bankName || '--'}</div>
                        <div>Account Name : ${inv.bankDetails?.accountName || '--'}</div>
                        <div>Account No. : ${inv.bankDetails?.accountNo || '--'}</div>
                        <div>IFSC Code : ${inv.bankDetails?.ifsc || '--'}</div>
                        <div>Branch Name : ${inv.bankDetails?.branch || '--'}</div>
                      </td>
                      <td width="33.34%" valign="top" style="padding:8px;border-right:1px solid #d1d5db;font-size:9px;line-height:1.5;color:#1a1a1a">
                        <div style="min-height:120px;display:flex;flex-direction:column">
                          <div>Received the above goods / services in good condition.</div>
                          <div style="margin-top:auto;border-top:1px dashed #d1d5db;padding-top:6px;text-align:center;color:#9ca3af;font-size:9px">(Signature &amp; Company Seal)</div>
                        </div>
                      </td>
                      <td width="33.33%" valign="top" style="padding:8px;font-size:9px;line-height:1.5;color:#1a1a1a;text-align:center">
                        <div style="min-height:120px;display:flex;flex-direction:column">
                          <div style="margin-top:auto">
                            <img src="https://res.cloudinary.com/ddjhixcwh/image/upload/v1788348856/ensis/home/dxms1ugculnifsmud6p7.webp" alt="Authorized Sign" style="width:75px;height:75px;margin:8px auto;display:block;border:0;object-fit:contain" />
                            <div style="border-top:1px dashed #d1d5db;padding-top:6px;text-align:center;color:#9ca3af;font-size:9px">Authorized Signatory.</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- FOOTER (WITH TOP MARGIN) -->
              <tr>
                <td style="padding-top:8px;background-color:#ffffff">
                  <div style="background-color:#1a3a5c;color:#ffffff;text-align:center;padding:8px;font-size:9px">
                    This is a computer generated document and does not require a physical signature.
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
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
  const subject = `${TYPE_LABELS[invoice.type] || 'Invoice'} ${invoice.invoiceNumber} - Design House India`;

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
  const msg = `Hello ${leadName},\n\nPlease find your *${TYPE_LABELS[invoice.type] || 'Invoice'}* (${invoice.invoiceNumber}) from Design House India.\n\n*Amount: ${fmt(invoice.totalAmount)}*\n*Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}*\n\nPlease review and let us know if you have any questions.\n\n Regards,\nDesign House India`;

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
