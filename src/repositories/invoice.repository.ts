import { Types } from 'mongoose';
import { InvoiceModel, IInvoice } from '../models/invoice.model';
import { LeadModel } from '../models/lead.model';

export const createInvoice = async (payload: Partial<IInvoice>): Promise<IInvoice> => {
  const invoice = new InvoiceModel(payload);
  return invoice.save();
};

export const getInvoicesByLead = async (leadId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const query = { lead: new Types.ObjectId(leadId) };
  const [invoices, total] = await Promise.all([
    InvoiceModel.find(query)
      .populate('lead', 'firstName lastName email phone companyName')
      .populate('order')
      .populate('items.product', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InvoiceModel.countDocuments(query),
  ]);
  return { invoices, total, page, limit };
};

export const getAllInvoices = async (page = 1, limit = 20, filters: { type?: string; status?: string; search?: string } = {}) => {
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = {};
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  const term = filters.search?.trim();
  if (term) {
    // Escaped so typed text can never act as a regex pattern
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const customers = await LeadModel.find({
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }, { companyName: regex }],
    })
      .select('_id')
      .limit(500)
      .lean();
    query.$or = [
      { invoiceNumber: regex },
      { 'billingAddress.name': regex },
      { 'billingAddress.phone': regex },
      { lead: { $in: customers.map((c) => c._id) } },
    ];
  }
  const [invoices, total, totals] = await Promise.all([
    InvoiceModel.find(query)
      .populate('lead', 'firstName lastName email phone companyName')
      .populate('order', 'orderStatus paymentStatus totalAmount createdAt')
      .populate('items.product', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    InvoiceModel.countDocuments(query),
    // Summary over all non-cancelled invoices, independent of the current filters
    InvoiceModel.aggregate<{ _id: string; count: number; billed: number; received: number }>([
      { $group: { _id: '$status', count: { $sum: 1 }, billed: { $sum: '$totalAmount' }, received: { $sum: '$paymentReceived' } } },
    ]),
  ]);
  // Money totals count tax invoices only: estimates (proforma) and challans are not bills
  const [money] = await InvoiceModel.aggregate<{ billed: number; received: number }>([
    { $match: { type: 'tax', status: { $ne: 'cancelled' } } },
    { $group: { _id: null, billed: { $sum: '$totalAmount' }, received: { $sum: '$paymentReceived' } } },
  ]);
  const billed = money?.billed || 0;
  const received = money?.received || 0;
  return {
    invoices,
    total,
    page,
    limit,
    summary: {
      count: totals.reduce((sum, t) => sum + t.count, 0),
      byStatus: Object.fromEntries(totals.map((t) => [t._id, t.count])),
      billed,
      received,
      outstanding: Math.max(0, billed - received),
    },
  };
};

export const getInvoiceById = async (id: string) => {
  return InvoiceModel.findById(id)
    .populate('lead', 'firstName lastName email phone companyName phoneCode addressLine city state country zipCode')
    .populate('order')
    .populate('items.product', 'title slug images')
    .populate('createdBy', 'name');
};

export const updateInvoiceById = async (id: string, payload: Partial<IInvoice>) => {
  return InvoiceModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
};

export const deleteInvoiceById = async (id: string) => {
  return InvoiceModel.findByIdAndDelete(id);
};

export const getNextInvoiceNumber = async (type: string): Promise<string> => {
  const typePrefix: Record<string, string> = {
    proforma: 'PI',
    tax: 'TI',
    credit_note: 'CN',
    debit_note: 'DN',
    delivery_challan: 'DC',
  };
  const prefix = typePrefix[type] || 'INV';

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd = fyStart + 1;
  const fyShort = `${String(fyStart).slice(-2)}-${String(fyEnd).slice(-2)}`;
  const fyLabel = `FY${fyShort}`;

  const lastInvoice = await InvoiceModel.findOne({
    invoiceNumber: { $regex: `^DHIPL/${fyLabel}/${prefix}/` },
  })
    .sort({ createdAt: -1 })
    .select('invoiceNumber');

  let nextNum = 1;
  if (lastInvoice?.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/\/(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `DHIPL/${fyLabel}/${prefix}/${String(nextNum).padStart(3, '0')}`;
};

export const getInvoiceStatsByLead = async (leadId: string) => {
  const result = await InvoiceModel.aggregate([
    { $match: { lead: new Types.ObjectId(leadId) } },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$totalAmount' },
        paymentReceived: { $sum: '$paymentReceived' },
        count: { $sum: 1 },
        paidCount: {
          $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] },
        },
      },
    },
  ]);
  return result[0] || { totalAmount: 0, paymentReceived: 0, count: 0, paidCount: 0 };
};
