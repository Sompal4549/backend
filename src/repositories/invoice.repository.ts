import { Types } from 'mongoose';
import { InvoiceModel, IInvoice } from '../models/invoice.model';

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
  const query: Record<string, any> = {};
  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.$or = [
      { invoiceNumber: { $regex: filters.search, $options: 'i' } },
    ];
  }
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
  const prefix = {
    proforma: 'PI',
    tax: 'INV',
    credit_note: 'CN',
    debit_note: 'DN',
    delivery_challan: 'DC',
  }[type] || 'INV';

  const lastInvoice = await InvoiceModel.findOne({ type })
    .sort({ createdAt: -1 })
    .select('invoiceNumber');

  let nextNum = 1;
  if (lastInvoice?.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
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
