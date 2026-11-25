import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';
import { generateDocumentNumber } from '../../../utils/document-series.util';
import { QuotationModel } from '../../../models/quotation.model';
import { SalesOrderModel } from '../../../models/sales-order.model';

export const crmQuotationsRouter = Router();

const baseLines = [
  { id: 'l1', name: 'Steam Chamber', spec: 'Standard model', qty: 2, unit: 'Nos.', rate: 60000, discount: 0, gst: 18 },
  { id: 'l2', name: 'Therapy Table', spec: 'Standard model', qty: 1, unit: 'Nos.', rate: 45000, discount: 0, gst: 18 },
  { id: 'l3', name: 'Shirodhara Stand', spec: 'Adjustable stand', qty: 2, unit: 'Nos.', rate: 12500, discount: 0, gst: 18 },
];

const initialQuotations = [
  {
    id: 'QT-2026-0130',
    revision: 1,
    status: 'Draft',
    approvalStatus: 'Not submitted',
    date: '2026-11-16',
    validUntil: '2026-11-30',
    businessType: 'Equipment',
    owner: 'Simran Kaur',
    opportunity: 'OP-0061 / Clinic Equipment',
    client: {
      name: 'Aarogya Ayurveda',
      contact: 'Dr. Neha Verma',
      email: 'neha@example.com',
      phone: '+91 98765 43210',
      city: 'Jaipur, Rajasthan',
      gstin: '',
    },
    deliverySameAsBilling: true,
    placeOfSupply: 'Rajasthan',
    lines: baseLines,
    discount: 10000,
    shipping: 0,
    advancePercent: 50,
    terms: {
      payment: '50% advance, balance before dispatch',
      delivery: '2–3 weeks from advance',
      freight: 'Included',
      warranty: '1 Year Comprehensive Warranty',
      note: '',
    },
    revisions: [],
    totalAmount: 204350,
  },
  {
    id: 'QT-0124',
    revision: 1,
    status: 'Accepted',
    approvalStatus: 'Approved',
    date: '2026-10-14',
    validUntil: '2026-11-14',
    businessType: 'Equipment',
    owner: 'Simran Kaur',
    opportunity: 'OP-0050 / Ayurveda Droni Setup',
    client: {
      name: 'Aarogya Ayurveda',
      contact: 'Dr. Neha Verma',
      email: 'neha@example.com',
      phone: '+91 98765 43210',
      city: 'Jaipur, Rajasthan',
      gstin: '',
    },
    deliverySameAsBilling: true,
    placeOfSupply: 'Rajasthan',
    lines: baseLines,
    discount: 5000,
    shipping: 0,
    advancePercent: 50,
    terms: {
      payment: '50% advance, balance before dispatch',
      delivery: '2 weeks from advance',
      freight: 'Included',
      warranty: '1 Year Warranty',
      note: '',
    },
    revisions: [],
    totalAmount: 240000,
  },
  {
    id: 'QT-0125',
    revision: 2,
    status: 'Sent',
    approvalStatus: 'Approved',
    date: '2026-10-15',
    validUntil: '2026-11-15',
    businessType: 'Turnkey',
    owner: 'Amit Mehta',
    opportunity: 'OP-0052 / Resort Wellness Wing',
    client: {
      name: 'Serene Resort',
      contact: 'Rahul Mehta',
      email: 'rahul@serene.example',
      phone: '+91 98111 22334',
      city: 'Goa',
      gstin: '',
    },
    deliverySameAsBilling: true,
    placeOfSupply: 'Goa',
    lines: baseLines,
    discount: 15000,
    shipping: 0,
    advancePercent: 40,
    terms: {
      payment: '40% advance, balance on installation',
      delivery: '3–4 weeks',
      freight: 'Included',
      warranty: '1 Year Warranty',
      note: '',
    },
    revisions: [],
    totalAmount: 340000,
  },
  {
    id: 'QT-0126',
    revision: 1,
    status: 'Awaiting approval',
    approvalStatus: 'Pending',
    date: '2026-10-16',
    validUntil: '2026-11-16',
    businessType: 'Consultancy',
    owner: 'Ritu Sharma',
    opportunity: 'OP-0055 / Wellness Center Setup',
    client: {
      name: 'Healing Centre',
      contact: 'Sanjay Gupta',
      email: 'sanjay@healing.example',
      phone: '+91 98222 33445',
      city: 'Pune, Maharashtra',
      gstin: '',
    },
    deliverySameAsBilling: true,
    placeOfSupply: 'Maharashtra',
    lines: baseLines,
    discount: 20000,
    shipping: 0,
    advancePercent: 50,
    terms: {
      payment: '50% advance, balance before dispatch',
      delivery: '2 weeks',
      freight: 'Included',
      warranty: '1 Year Warranty',
      note: '',
    },
    revisions: [],
    totalAmount: 160000,
  },
  {
    id: 'QT-0127',
    revision: 1,
    status: 'Draft',
    approvalStatus: 'Not submitted',
    date: '2026-10-18',
    validUntil: '2026-11-18',
    businessType: 'Equipment',
    owner: 'Amit Mehta',
    opportunity: 'OP-0058 / Panchkarma Table Addition',
    client: {
      name: 'Wellness Spa',
      contact: 'Priya Nair',
      email: 'priya@spa.example',
      phone: '+91 98333 44556',
      city: 'Kochi, Kerala',
      gstin: '',
    },
    deliverySameAsBilling: true,
    placeOfSupply: 'Kerala',
    lines: baseLines,
    discount: 0,
    shipping: 0,
    advancePercent: 50,
    terms: {
      payment: '50% advance, balance before dispatch',
      delivery: '2 weeks',
      freight: 'Included',
      warranty: '1 Year Warranty',
      note: '',
    },
    revisions: [],
    totalAmount: 180000,
  },
  {
    id: 'QT-0128',
    revision: 2,
    status: 'Negotiation',
    approvalStatus: 'Pending',
    date: '2026-10-20',
    validUntil: '2026-11-20',
    businessType: 'Equipment',
    owner: 'Simran Kaur',
    opportunity: 'OP-0060 / Clinic Package',
    client: {
      name: 'Ayurveda Care',
      contact: 'Dr. Kavita Shah',
      email: 'kavita@care.example',
      phone: '+91 98444 55667',
      city: 'Ahmedabad, Gujarat',
      gstin: '',
    },
    deliverySameAsBilling: true,
    placeOfSupply: 'Gujarat',
    lines: baseLines,
    discount: 12000,
    shipping: 0,
    advancePercent: 50,
    terms: {
      payment: '50% advance, balance before dispatch',
      delivery: '2 weeks',
      freight: 'Included',
      warranty: '1 Year Warranty',
      note: '',
    },
    revisions: [],
    totalAmount: 210000,
  },
];

const initialSalesOrder = {
  id: 'SO-2026-0090',
  status: 'In Production',
  quotationId: 'QT-2026-0130',
  quotationRevision: 2,
  orderDate: '2026-11-17',
  client: 'Aarogya Ayurveda',
  clientContact: 'Dr. Neha Verma',
  owner: 'Rajesh Kumar',
  dispatchDate: '2026-11-23',
  deliverySite: 'Jaipur',
  address: 'Tonk Road, Jaipur',
  lines: baseLines,
  discount: 10000,
  advancePercent: 50,
  value: 204350,
  stages: [
    { label: 'Confirmed', detail: '17 Nov 2026, 10:20 AM', state: 'done' },
    { label: 'Advance Received', detail: '17 Nov 2026, 11:05 AM', state: 'done' },
    { label: 'Production', detail: 'In Progress', state: 'current' },
    { label: 'QC', detail: 'Pending', state: 'pending' },
    { label: 'Dispatch', detail: 'Planned 23 Nov 2026', state: 'pending' },
  ],
  linkedDocuments: [
    { label: 'Quotation', id: 'QT-2026-0130 Rev 2', note: '(from Rev 1)' },
    { label: 'Job Bag (Production)', id: 'JB0090' },
    { label: 'Invoice', id: 'INV0144' },
    { label: 'Receipt (Advance)', id: 'RC0095' },
  ],
  timeline: [
    { at: '17 Nov 2026, 10:20 AM', text: 'Sales order confirmed (SO-2026-0090)', state: 'done' },
    { at: '17 Nov 2026, 11:05 AM', text: 'Advance received – ₹1,12,100.00 (RC0095)', state: 'done' },
    { at: '17 Nov 2026, 11:30 AM', text: 'Sent to production (JB0090)', state: 'current' },
    { at: '', text: 'QC – Pending', state: 'pending' },
    { at: '', text: 'Dispatch – Planned for 23 Nov 2026', state: 'pending' },
  ],
  notes: '',
};

async function ensureSeedData() {
  try {
    const qCount = await QuotationModel.countDocuments();
    if (qCount === 0) {
      await QuotationModel.insertMany(initialQuotations);
    }
    const soCount = await SalesOrderModel.countDocuments();
    if (soCount === 0) {
      await SalesOrderModel.create(initialSalesOrder);
    }
  } catch (err: any) {
    console.warn('[CRM Quotations] Seed error:', err?.message);
  }
}

// GET /api/v1/crm/quotations/overview
crmQuotationsRouter.get('/overview', async (_req, res) => {
  await ensureSeedData();
  try {
    const quotations = await QuotationModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
    const salesOrders = await SalesOrderModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();

    const draftsCount = quotations.filter((q) => q.status === 'Draft' || q.status === 'Revision Draft').length;
    const awaitingApprovalCount = quotations.filter((q) => q.status === 'Awaiting approval' || q.approvalStatus === 'Pending').length;
    const sentCount = quotations.filter((q) => q.status === 'Sent').length;
    const confirmedCount = salesOrders.length;

    const formattedRows = quotations.map((q) => {
      let tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' = 'neutral';
      if (q.status === 'Accepted' || q.status === 'Approved') tone = 'success';
      else if (q.status === 'Sent') tone = 'info';
      else if (q.status === 'Awaiting approval') tone = 'warning';
      else if (q.status === 'Negotiation') tone = 'danger';

      const action = q.status === 'Draft' || q.status === 'Revision Draft' ? 'Edit' : q.status === 'Awaiting approval' ? 'Review' : 'View';
      const valNum = q.totalAmount || 0;
      const valueStr = valNum >= 100000 ? `₹${(valNum / 100000).toFixed(1)}L` : `₹${valNum.toLocaleString('en-IN')}`;

      return {
        id: q.id,
        client: q.client?.name || 'Client',
        businessType: q.businessType || 'Equipment',
        value: valueStr,
        revision: `Rev ${q.revision || 1}`,
        owner: q.owner || 'Simran Kaur',
        status: { label: q.status, tone },
        action,
      };
    });

    const approvals = quotations
      .filter((q) => q.approvalStatus === 'Pending' || q.status === 'Awaiting approval')
      .map((q) => ({
        id: q.id,
        client: q.client?.name || 'Client',
        reason: q.revisionReason || `Discount on quotation (${q.discount ? `₹${q.discount}` : 'Special pricing'})`,
        requires: 'Requires Sales Manager approval',
        requestedBy: q.owner || 'Simran Kaur',
        requestedAt: q.date ? `${q.date}` : 'Recently',
      }));

    const confirmedOrders = salesOrders.map((so) => {
      const val = typeof so.value === 'number' ? `₹${(so.value / 100000).toFixed(1)}L` : String(so.value || '₹2.4L');
      return {
        id: so.id,
        client: so.client,
        fromQuotation: so.quotationId || 'QT-0124',
        value: val,
        status: so.status || 'In Production',
        orderDate: so.orderDate,
        owner: so.owner || 'Simran Kaur',
      };
    });

    return successResponse(
      res,
      {
        kpis: {
          drafts: draftsCount,
          awaitingApproval: awaitingApprovalCount,
          sentThisMonth: sentCount,
          confirmedOrders: confirmedCount,
        },
        quotations: formattedRows,
        approvals,
        confirmedOrders,
      },
      'Quotations overview retrieved'
    );
  } catch {
    return successResponse(
      res,
      {
        kpis: { drafts: 0, awaitingApproval: 0, sentThisMonth: 0, confirmedOrders: 0 },
        quotations: [],
        approvals: [],
        confirmedOrders: [],
      },
      'Quotations fallback retrieved'
    );
  }
});

// GET /api/v1/crm/quotations/new
crmQuotationsRouter.get('/new', async (_req, res) => {
  await ensureSeedData();
  const count = await QuotationModel.countDocuments();
  const nextNum = 130 + count + 1;
  const newId = generateDocumentNumber('estimate', nextNum);

  const newDraft = {
    ...initialQuotations[0],
    id: newId,
    revision: 1,
    status: 'Draft',
    approvalStatus: 'Not submitted',
    date: new Date().toISOString().split('T')[0],
    revisions: [],
  };

  successResponse(res, newDraft, 'New quotation draft');
});

// GET /api/v1/crm/quotations/:id
crmQuotationsRouter.get('/:id', async (req, res) => {
  await ensureSeedData();
  try {
    let quotation = await QuotationModel.findOne({ id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!quotation && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      quotation = await QuotationModel.findById(req.params.id).lean();
    }
    if (!quotation) {
      // Check if it matches any initial template
      quotation = initialQuotations.find((q) => q.id === req.params.id) as any;
    }
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    return successResponse(res, quotation, 'Quotation retrieved');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error fetching quotation' });
  }
});

// POST /api/v1/crm/quotations
crmQuotationsRouter.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const count = await QuotationModel.countDocuments();
    const id = body.id || generateDocumentNumber('estimate', 130 + count + 1);

    const isSubmit = Boolean(body.submit);
    const status = isSubmit ? 'Approved' : (body.status || 'Draft');
    const approvalStatus = isSubmit ? 'Approved' : (body.approvalStatus || 'Not submitted');

    // Calculate total
    const lines = Array.isArray(body.lines) ? body.lines : [];
    let subtotal = 0;
    lines.forEach((l: any) => {
      const lineTotal = (Number(l.rate) || 0) * (Number(l.qty) || 1) - (Number(l.discount) || 0);
      const tax = (lineTotal * (Number(l.gst) || 18)) / 100;
      subtotal += lineTotal + tax;
    });
    const discount = Number(body.discount) || 0;
    const shipping = Number(body.shipping) || 0;
    const totalAmount = Math.max(0, subtotal - discount + shipping);

    const quotation = await QuotationModel.findOneAndUpdate(
      { id },
      {
        ...body,
        id,
        status,
        approvalStatus,
        totalAmount,
        isDeleted: false,
      },
      { upsert: true, new: true }
    );

    return successResponse(res, { id: quotation.id }, 'Quotation created', 201);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error creating quotation' });
  }
});

// PUT /api/v1/crm/quotations/:id
crmQuotationsRouter.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    await QuotationModel.findOneAndUpdate({ id }, { $set: body }, { new: true });
    return successResponse(res, { id, ...body }, 'Quotation updated');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error updating quotation' });
  }
});

// POST /api/v1/crm/quotations/:id/send
crmQuotationsRouter.post('/:id/send', async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const via = body.via || 'email';
    const recipient = body.recipient || '';
    const cc = body.cc || '';
    const subject = body.subject || `ENSIS Quotation ${id}`;
    const message = body.message || '';

    await QuotationModel.findOneAndUpdate(
      { id },
      {
        $set: {
          status: 'Sent',
          sentVia: via,
          sentTo: recipient,
          sentCc: cc,
          sentAt: new Date().toISOString(),
          sentSubject: subject,
          sentMessage: message,
        },
      }
    );

    try {
      const { CrmRecord } = await import('../../../models/crm-record.model');
      const existingActivitiesDoc = await CrmRecord.findOne({ key: 'dashboard.activities' });
      const currentActivities = existingActivitiesDoc?.data || [];
      const newActivity = {
        id: `act-${Date.now().toString().slice(-4)}`,
        at: 'Just now',
        by: body.sender || 'Sales Team',
        text: `Quotation ${id} sent via ${via === 'whatsapp' ? 'WhatsApp' : 'Email'} to ${recipient}`,
        module: 'Sales',
      };
      await CrmRecord.findOneAndUpdate(
        { key: 'dashboard.activities' },
        { key: 'dashboard.activities', data: [newActivity, ...currentActivities] },
        { upsert: true, new: true }
      );
    } catch (_actErr) {
      // Activity logging fallback
    }

    if (via === 'email' && recipient) {
      try {
        const { sendEmail } = await import('../../../services/email.service');
        const formattedHtml = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <div style="border-bottom: 2px solid #005a36; padding-bottom: 12px; margin-bottom: 20px;">
              <h2 style="color: #005a36; margin: 0;">ENSIS — Panchkarma &amp; Wellness Spaces</h2>
            </div>
            <div style="white-space: pre-line; font-size: 14px; margin-bottom: 24px;">
              ${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </div>
            <div style="background-color: #f9fafb; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #4b5563; border-left: 4px solid #005a36;">
              <strong>Quotation Reference:</strong> ${id}<br />
              <strong>Official Contact:</strong> sales@ensis.in | +91 98110 02200
            </div>
          </div>
        `;
        await sendEmail(recipient, subject, message, formattedHtml, undefined, cc);
      } catch (emailErr) {
        console.error('[Quotation Send Email Error]:', emailErr);
      }
    } else if (via === 'whatsapp' && recipient) {
      try {
        const { sendWhatsAppMessage } = await import('../../../utils/whatsapp');
        await sendWhatsAppMessage(recipient, message);
      } catch (waErr) {
        console.error('[Quotation Send WhatsApp Error]:', waErr);
      }
    }

    return successResponse(res, { id, status: 'Sent' }, 'Quotation sent successfully');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error sending quotation' });
  }
});

// POST /api/v1/crm/quotations/:id/approve
crmQuotationsRouter.post('/:id/approve', async (req, res) => {
  try {
    const id = req.params.id;
    await QuotationModel.findOneAndUpdate(
      { id },
      { $set: { status: 'Approved', approvalStatus: 'Approved' } },
      { new: true }
    );
    return successResponse(res, { id, status: 'Approved', approvalStatus: 'Approved' }, 'Quotation approved successfully');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error approving quotation' });
  }
});

// POST /api/v1/crm/quotations/:id/revisions
crmQuotationsRouter.post('/:id/revisions', async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const existing = await QuotationModel.findOne({ id });

    const nextRevision = (existing?.revision || 1) + 1;
    const revisions = existing?.revisions ? [...existing.revisions] : [];
    revisions.push({
      revision: existing?.revision || 1,
      total: existing?.totalAmount || 0,
      createdOn: new Date().toLocaleDateString('en-IN'),
      createdBy: existing?.owner || 'Simran Kaur',
    });

    await QuotationModel.findOneAndUpdate(
      { id },
      {
        $set: {
          ...body,
          revision: nextRevision,
          status: 'Revision Draft',
          approvalStatus: 'Not submitted',
          revisions,
        },
      },
      { new: true }
    );

    return successResponse(res, { id, revision: nextRevision }, 'Revision created', 201);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error creating revision' });
  }
});

// Sales Orders endpoints
crmQuotationsRouter.get('/sales-orders/:id', async (req, res) => {
  await ensureSeedData();
  try {
    let order = await SalesOrderModel.findOne({ id: req.params.id, isDeleted: false }).lean();
    if (!order) {
      order = (await SalesOrderModel.findOne().lean()) || (initialSalesOrder as any);
    }
    return successResponse(res, order, 'Sales order retrieved');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error fetching sales order' });
  }
});

crmQuotationsRouter.post('/sales-orders', async (req, res) => {
  try {
    const body = req.body || {};
    const count = await SalesOrderModel.countDocuments();
    const id = body.id || generateDocumentNumber('sales order', 90 + count + 1);

    const order = await SalesOrderModel.create({
      ...body,
      id,
      orderDate: body.orderDate || new Date().toISOString().split('T')[0],
      client: body.client || 'Client',
      owner: body.owner || 'Rajesh Kumar',
      status: body.status || 'In Production',
    });

    return successResponse(res, { id: order.id }, 'Sales order created', 201);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error creating sales order' });
  }
});

crmQuotationsRouter.put('/sales-orders/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const updated = await SalesOrderModel.findOneAndUpdate({ id }, { $set: body }, { new: true });
    return successResponse(res, { id: updated?.id || id }, 'Sales order updated');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error updating sales order' });
  }
});
