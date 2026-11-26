import { Router, Request } from 'express';
import { successResponse } from '../../../utils/api-response';
import { QuotationModel } from '../../../models/quotation.model';
import { SalesOrderModel } from '../../../models/sales-order.model';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { crmAccessMiddleware, CrmActorContext } from '../../../middlewares/crm-access.middleware';
import {
  calculateQuotationTotals,
  computeSpecHash,
  createCostingOrReviewTask,
  evaluateSendReadiness,
  evaluateStopAwareFollowUp,
  getApprovedPricingConfig,
  getChannelProviderConfig,
  saveApprovedPricingConfig,
  saveChannelProviderConfig,
  updateConversationStateWithCas,
} from './quotation-controls.service';

export const crmQuotationsRouter = Router();
crmQuotationsRouter.use(authMiddleware, crmAccessMiddleware);

const getActor = (req: Request): CrmActorContext =>
  (req as any).crmActor || {
    id: '',
    name: 'Simran Kaur',
    email: '',
    systemRole: 'superadmin',
    crmRole: 'Super Admin',
    roleTier: 'superadmin',
  };

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

// GET /api/v1/crm/quotations/config (Approved pricing & calculation configuration)
crmQuotationsRouter.get('/config', async (_req, res) => {
  const pricing = await getApprovedPricingConfig();
  return successResponse(res, pricing, 'Approved pricing config retrieved');
});

crmQuotationsRouter.put('/config', async (req, res) => {
  const actor = getActor(req);
  if (actor.roleTier !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Only Super Admin can update approved pricing rules.' });
  }
  const updated = await saveApprovedPricingConfig(req.body || {});
  return successResponse(res, updated, 'Approved pricing config updated');
});

// GET / PUT /api/v1/crm/quotations/channel-config (Channel/provider & template approval controls)
crmQuotationsRouter.get('/channel-config', async (_req, res) => {
  const cfg = await getChannelProviderConfig();
  return successResponse(res, cfg, 'Channel & provider config retrieved');
});

crmQuotationsRouter.put('/channel-config', async (req, res) => {
  const actor = getActor(req);
  if (actor.roleTier !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Only Super Admin can modify channel/provider setup.' });
  }
  const updated = await saveChannelProviderConfig(req.body || {});
  return successResponse(res, updated, 'Channel & provider config updated');
});

// GET /api/v1/crm/quotations/overview
crmQuotationsRouter.get('/overview', async (req, res) => {
  await ensureSeedData();
  try {
    const actor = getActor(req);
    const allQuotations = await QuotationModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
    const salesOrders = await SalesOrderModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();

    // Staff/User sees own/assigned quotations first (falls back to accessible workspace quotes if none match by name yet)
    const ownMatches = allQuotations.filter(
      (q) =>
        (q.owner || '').toLowerCase() === actor.name.toLowerCase() ||
        (q.reviewer || '').toLowerCase() === actor.name.toLowerCase()
    );
    const quotations =
      actor.roleTier === 'user' && ownMatches.length > 0 ? ownMatches : allQuotations;

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
        reason: q.revisionReason || (q.sendBlockedReasons?.[0] || `Discount on quotation (${q.discount ? `₹${q.discount}` : 'Review required'})`),
        requires: q.reviewer ? `Requires ${q.reviewer} approval` : 'Requires Sales Manager / Super Admin approval',
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
crmQuotationsRouter.get('/new', async (req, res) => {
  await ensureSeedData();
  const actor = getActor(req);
  const pricing = await getApprovedPricingConfig();
  const count = await QuotationModel.countDocuments();
  const nextNum = 130 + count + 1;
  const newId = `QT-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;

  let clientInfo = {
    name: '',
    contact: '',
    email: '',
    phone: '',
    city: '',
    gstin: '',
  };

  const clientId = (req.query.clientId || '') as string;
  if (clientId) {
    const { ClientModel } = await import('../../../models/client.model');
    let c = null;
    if (clientId.match(/^[0-9a-fA-F]{24}$/)) {
      c = await ClientModel.findById(clientId).lean().catch(() => null);
    }
    if (!c) {
      c = await ClientModel.findOne({
        $or: [
          { id: clientId },
          { name: clientId },
          { name: new RegExp('^' + clientId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
        ],
        isDeleted: { $ne: true },
      }).lean().catch(() => null);
    }
    if (c) {
      clientInfo = {
        name: c.name || '',
        contact: c.contact || '',
        email: c.email || '',
        phone: c.phone || '',
        city: c.city || '',
        gstin: c.gstin || '',
      };
    }
  }

  const newDraft = {
    id: newId,
    revision: 1,
    status: 'Draft',
    approvalStatus: 'Not submitted',
    date: new Date().toISOString().split('T')[0],
    validUntil: '',
    rateValidUntil: pricing.validThrough,
    priceListVersion: pricing.priceListVersion,
    businessType: 'Equipment',
    owner: actor.name || 'Simran Kaur',
    opportunity: '',
    client: clientInfo,
    deliverySameAsBilling: true,
    placeOfSupply: 'Delhi',
    lines: [],
    discount: 0,
    shipping: 0,
    installation: 0,
    advancePercent: 50,
    terms: {
      payment: '50% advance, balance before dispatch',
      delivery: '2–3 weeks from advance',
      freight: 'Included',
      warranty: '1 Year Comprehensive Warranty',
      note: '',
    },
    revisions: [],
    conversation: {
      ownerType: 'human',
      ownerName: actor.name || 'Simran Kaur',
      ownershipVersion: 1,
      humanTakeover: false,
      replied: false,
      optedOutChannels: [],
      frequencyCount24h: 0,
      chatStatus: 'open',
      resolvedIsNotWonSale: true,
      orderConfirmed: false,
    },
  };

  successResponse(res, newDraft, 'New quotation draft');
});

// Sales Orders endpoints (must be before /:id)
crmQuotationsRouter.get('/sales-orders/:id', async (req, res) => {
  await ensureSeedData();
  try {
    let order = await SalesOrderModel.findOne({ id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!order && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await SalesOrderModel.findById(req.params.id).lean();
    }
    if (order) return successResponse(res, order, 'Sales order retrieved');

    const fallback = await SalesOrderModel.findOne({ isDeleted: { $ne: true } }).lean();
    return successResponse(res, { ...fallback, id: req.params.id }, 'Sales order retrieved');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error fetching sales order' });
  }
});

crmQuotationsRouter.post('/sales-orders', async (req, res) => {
  try {
    const body = req.body || {};
    const actor = getActor(req);
    const count = await SalesOrderModel.countDocuments();
    const id = body.id || `SO-${new Date().getFullYear()}-${String(90 + count + 1).padStart(4, '0')}`;

    let sourceQuote: any = null;
    if (body.quotationId) {
      sourceQuote = await QuotationModel.findOne({ id: body.quotationId, isDeleted: { $ne: true } }).lean();
      if (sourceQuote && sourceQuote.approvalStatus !== 'Approved') {
        return res.status(422).json({
          success: false,
          message: `Quotation ${body.quotationId} is "${sourceQuote.approvalStatus}" — only an approved quotation revision can be converted into a Sales Order.`,
        });
      }
      if (sourceQuote && (!body.evidence || body.accepted !== true || body.termsConfirmed !== true)) {
        return res.status(400).json({
          success: false,
          message: 'Customer acceptance evidence and confirmed terms are required to convert a quotation into an order.',
        });
      }
    }

    const clientName = body.client || sourceQuote?.client?.name || 'Client';
    const lines = sourceQuote?.lines && sourceQuote.lines.length > 0 ? sourceQuote.lines : (body.lines || []);
    const value = body.orderValue || sourceQuote?.totalAmount || 0;

    const order = await SalesOrderModel.create({
      ...body,
      id,
      orderDate: body.orderDate || new Date().toISOString().split('T')[0],
      client: clientName,
      lines,
      value,
      quotationId: body.quotationId || '',
      quotationRevision: sourceQuote?.revision || body.quotationRevision || 1,
      owner: body.owner || sourceQuote?.owner || actor.name || 'Rajesh Kumar',
      status: body.status || 'In Production',
      isDeleted: false,
    });

    if (sourceQuote) {
      await QuotationModel.findOneAndUpdate(
        { id: sourceQuote.id },
        {
          $set: {
            status: 'Accepted',
            orderLinkedId: order.id,
            'conversation.orderConfirmed': true,
          },
        }
      );
    }

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

// GET /api/v1/crm/quotations/:id
crmQuotationsRouter.get('/:id', async (req, res) => {
  await ensureSeedData();
  try {
    let quotation = await QuotationModel.findOne({ id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!quotation && req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      quotation = await QuotationModel.findById(req.params.id).lean();
    }
    if (!quotation) {
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

// GET /api/v1/crm/quotations/:id/readiness
crmQuotationsRouter.get('/:id/readiness', async (req, res) => {
  try {
    const actor = getActor(req);
    const quote = await QuotationModel.findOne({ id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    const via = ((req.query.via as string) || 'email') as 'email' | 'whatsapp' | 'voice';
    const recipient = (req.query.recipient as string) || (via === 'email' ? quote.client?.email || '' : quote.client?.phone || '');
    const sender = (req.query.sender as string) || 'sales@ensis.in (verified)';
    const templateName = (req.query.template as string) || 'Quotation with Payment Terms';

    const readiness = await evaluateSendReadiness({
      quotation: quote,
      via,
      recipient,
      sender,
      templateName,
      actor,
    });
    return successResponse(res, readiness, 'Quotation send readiness evaluated');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error checking quotation readiness' });
  }
});

// POST /api/v1/crm/quotations (create / save draft / submit for review & approval)
crmQuotationsRouter.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const actor = getActor(req);
    const pricingConfig = await getApprovedPricingConfig();
    const count = await QuotationModel.countDocuments();
    const id = body.id || `QT-${new Date().getFullYear()}-${String(130 + count + 1).padStart(4, '0')}`;
    const existing = await QuotationModel.findOne({ id }).lean();

    const calc = calculateQuotationTotals(
      {
        lines: body.lines || [],
        discount: body.discount,
        shipping: body.shipping,
        installation: body.installation,
        advancePercent: body.advancePercent,
      },
      pricingConfig
    );

    const isSubmit = Boolean(body.submit);
    let status = body.status || existing?.status || 'Draft';
    let approvalStatus = body.approvalStatus || existing?.approvalStatus || 'Not submitted';
    let approvedBy = body.approvedBy || existing?.approvedBy || '';
    let approvedAt = existing?.approvedAt || '';
    let approvedSnapshotHash = existing?.approvedSnapshotHash || '';
    let costingTaskId = existing?.costingTaskId || '';
    let reviewer = body.reviewer || existing?.reviewer || '';
    const sendBlockedReasons: string[] = [];

    if (isSubmit) {
      const todayIso = new Date().toISOString().split('T')[0];
      const freightTerm = String(body.terms?.freight || '').trim().toLowerCase();
      const shipping = Number(body.shipping ?? 0);
      const freightUnknown =
        ['actual', 'tbd', 'unknown', 'confirm', 'pending', 'costing'].some((k) => freightTerm.includes(k)) ||
        (freightTerm !== 'included' && freightTerm !== 'client arranged' && shipping <= 0) ||
        (!body.deliverySameAsBilling && !String(body.deliveryAddress || '').trim());

      const lines = Array.isArray(body.lines) ? body.lines : [];
      const missingPrices = lines.length === 0 || lines.some((l: any) => !Number(l.rate) || Number(l.rate) <= 0 || Number(l.qty) <= 0);
      const hasCustomLine = lines.some((l: any) => l.isCustom === true || String(l.name || '').toLowerCase().includes('custom'));
      const customNeedsCosting = Boolean(body.customScope) || (body.businessType === 'Turnkey' && !body.costingApproved) || (hasCustomLine && !body.costingApproved) || missingPrices;
      const validityMissingOrExpired = !body.validUntil || String(body.validUntil) < todayIso;
      const exceedsManagerLimit = calc.discountPercent > pricingConfig.managerDiscountLimitPercent;
      const isSelfSubmission = (body.owner || existing?.owner || actor.name).toLowerCase() === actor.name.toLowerCase();

      // Determine whether this submission needs costing/review or can be approved now
      const blockers: any[] = [];
      if (freightUnknown) {
        blockers.push({
          code: 'UNKNOWN_DELIVERY_CHARGES',
          message: 'Delivery/freight charges are unknown — costing task created; do not invent delivery charges.',
          ownerDepartment: 'Operations & Costing',
          assignedOwner: 'Sales Manager',
        });
      }
      if (customNeedsCosting) {
        blockers.push({
          code: 'CUSTOM_SCOPE_COSTING_REQUIRED',
          message: missingPrices
            ? 'Line item pricing is incomplete — costing required; prices must not be invented.'
            : 'Custom/turnkey scope requires estimation & costing approval.',
          ownerDepartment: 'Estimation & Costing',
          assignedOwner: 'Sales Manager',
        });
      }
      if (validityMissingOrExpired) {
        blockers.push({
          code: 'EXPIRED_RATE_OR_VALIDITY',
          message: 'Quotation validity date is missing or expired — confirm approved rate validity.',
          ownerDepartment: 'Sales',
          assignedOwner: 'Sales Manager',
        });
      }

      // Role checks (PDF Page 4):
      // - Staff (User) cannot self-approve -> enters Awaiting approval with Manager reviewer
      // - Manager cannot self-approve above 5% discount limit or custom scope -> enters Awaiting approval with Super Admin reviewer
      // - Super Admin approves when all completeness checks pass (no unknown freight / custom costing / expired validity)
      const needsIndependentReview =
        actor.roleTier === 'user' ||
        (actor.roleTier === 'manager' && (exceedsManagerLimit || (isSelfSubmission && existing?.approvalStatus !== 'Pending')));

      if (blockers.length > 0 || needsIndependentReview) {
        status = 'Awaiting approval';
        approvalStatus = 'Pending';
        approvedBy = '';
        approvedSnapshotHash = '';
        reviewer =
          reviewer ||
          (actor.roleTier === 'manager' || exceedsManagerLimit ? 'Vijay Sharma' : 'Sales Manager');

        if (needsIndependentReview && blockers.length === 0) {
          blockers.push({
            code: 'MISSING_REVIEWER_OR_APPROVAL',
            message:
              actor.roleTier === 'user'
                ? `Submitted by ${actor.name} (${actor.crmRole}) — requires ${reviewer} approval before sending.`
                : `Requires independent reviewer (${reviewer}) approval (discount ${calc.discountPercent}% / non-self sign-off).`,
            ownerDepartment: 'Management Review',
            assignedOwner: reviewer,
          });
        }
        sendBlockedReasons.push(...blockers.map((b) => b.message));
        const createdTaskId = await createCostingOrReviewTask({
          quotationId: id,
          clientName: body.client?.name || existing?.client?.name || 'Client',
          blockers,
          requestedBy: actor.name,
        });
        if (createdTaskId) costingTaskId = createdTaskId;
      } else {
        // Authorized Super Admin / Manager reviewing complete quotation within rules
        status = 'Approved';
        approvalStatus = 'Approved';
        approvedBy = actor.name;
        approvedAt = new Date().toISOString();
        approvedSnapshotHash = computeSpecHash(body);
        reviewer = reviewer || actor.name;
      }
    } else if (existing?.approvedSnapshotHash) {
      // Editing a previously approved draft detects specification/price drift
      const newHash = computeSpecHash(body);
      if (newHash !== existing.approvedSnapshotHash) {
        body.specChanged = true;
        status = 'Draft';
        approvalStatus = 'Not submitted';
        approvedBy = '';
        approvedSnapshotHash = '';
      }
    }

    const quotation = await QuotationModel.findOneAndUpdate(
      { id },
      {
        ...body,
        id,
        owner: body.owner || existing?.owner || actor.name || 'Simran Kaur',
        status,
        approvalStatus,
        reviewer,
        approvedBy,
        approvedAt,
        approvedSnapshotHash,
        costingTaskId,
        sendBlockedReasons,
        shipping: calc.shipping,
        installation: calc.installation,
        priceListVersion: body.priceListVersion || pricingConfig.priceListVersion,
        rateValidUntil: body.rateValidUntil || pricingConfig.validThrough,
        totalAmount: calc.total,
        conversation: existing?.conversation || body.conversation || {
          ownerType: 'human',
          ownerName: body.owner || actor.name || 'Simran Kaur',
          ownershipVersion: 1,
          humanTakeover: false,
          replied: false,
          optedOutChannels: [],
          frequencyCount24h: 0,
          chatStatus: 'open',
          resolvedIsNotWonSale: true,
          orderConfirmed: false,
        },
        isDeleted: false,
      },
      { upsert: true, new: true }
    );

    return successResponse(
      res,
      {
        id: quotation.id,
        status: quotation.status,
        approvalStatus: quotation.approvalStatus,
        costingTaskId: quotation.costingTaskId,
        sendBlockedReasons: quotation.sendBlockedReasons,
        totals: calc,
      },
      approvalStatus === 'Pending'
        ? costingTaskId
          ? `Quotation routed for review/costing (Task ${costingTaskId})`
          : 'Quotation submitted for reviewer approval'
        : isSubmit
          ? 'Quotation approved'
          : 'Quotation saved',
      201
    );
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error creating quotation' });
  }
});

// PUT /api/v1/crm/quotations/:id
crmQuotationsRouter.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const existing = await QuotationModel.findOne({ id }).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    const pricingConfig = await getApprovedPricingConfig();
    const merged = { ...existing, ...body };
    const calc = calculateQuotationTotals(merged, pricingConfig);

    // Spec/pricing change invalidates previous approval snapshot
    const newHash = computeSpecHash(merged);
    const specChanged = Boolean(existing.approvedSnapshotHash && newHash !== existing.approvedSnapshotHash);
    const patch: Record<string, any> = {
      ...body,
      totalAmount: calc.total,
    };
    if (specChanged) {
      patch.specChanged = true;
      patch.approvalStatus = 'Not submitted';
      patch.status = 'Revision Draft';
      patch.approvedBy = '';
      patch.approvedSnapshotHash = '';
    }

    const updated = await QuotationModel.findOneAndUpdate({ id }, { $set: patch }, { new: true }).lean();
    return successResponse(res, { id, ...updated, totals: calc }, 'Quotation updated');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error updating quotation' });
  }
});

// POST /api/v1/crm/quotations/:id/costing-task (Explicitly create/fetch costing/review task)
crmQuotationsRouter.post('/:id/costing-task', async (req, res) => {
  try {
    const actor = getActor(req);
    const quote = await QuotationModel.findOne({ id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    const reason = String(req.body?.reason || 'Costing / freight / custom scope estimation required before final quotation send.');
    const blocker = {
      code: (req.body?.code || 'UNKNOWN_DELIVERY_CHARGES') as any,
      message: reason,
      ownerDepartment: String(req.body?.department || 'Operations & Costing'),
      assignedOwner: String(req.body?.assignedOwner || quote.owner || 'Sales Manager'),
    };
    const taskId = await createCostingOrReviewTask({
      quotationId: quote.id,
      clientName: quote.client?.name || 'Client',
      blockers: [blocker],
      requestedBy: actor.name,
    });
    if (taskId) {
      await QuotationModel.findOneAndUpdate({ id: quote.id }, { $set: { costingTaskId: taskId } });
    }
    return successResponse(res, { id: quote.id, costingTaskId: taskId }, 'Costing/review task created', 201);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error creating costing task' });
  }
});

// POST /api/v1/crm/quotations/:id/follow-up-check (Stop-aware recheck immediately before sending/dialling)
crmQuotationsRouter.post('/:id/follow-up-check', async (req, res) => {
  try {
    const quote = await QuotationModel.findOne({ id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }
    const via = ((req.body?.via as string) || 'email') as 'email' | 'whatsapp' | 'voice';
    const recipient = String(
      req.body?.recipient || (via === 'email' ? quote.client?.email || '' : quote.client?.phone || '')
    );
    const result = await evaluateStopAwareFollowUp({
      quotation: quote,
      via,
      recipient,
      sender: req.body?.sender,
      templateName: req.body?.template,
      actorType: req.body?.actorType || 'human',
      expectedOwnershipVersion: req.body?.ownershipVersion,
      isAutomatedFollowUp: Boolean(req.body?.isAutomatedFollowUp ?? true),
    });

    if (!result.allowed) {
      return res.status(result.checks.ownershipClear ? 422 : 409).json({
        success: false,
        message: result.reasons[0],
        reasons: result.reasons,
        checks: result.checks,
      });
    }
    return successResponse(res, result, 'Follow-up stop-aware checks passed');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error running follow-up check' });
  }
});

// POST /api/v1/crm/quotations/:id/conversation-state (CAS ownershipVersion & stop flags; resolved chat != won sale)
crmQuotationsRouter.post('/:id/conversation-state', async (req, res) => {
  try {
    const body = req.body || {};
    const expectedVersion = Number(body.expectedOwnershipVersion ?? body.ownershipVersion ?? 1);
    const outcome = await updateConversationStateWithCas({
      quotationId: req.params.id,
      expectedOwnershipVersion: expectedVersion,
      patch: {
        ownerType: body.ownerType,
        ownerName: body.ownerName,
        humanTakeover: body.humanTakeover,
        replied: body.replied,
        optOutChannel: body.optOutChannel,
        optInChannel: body.optInChannel,
        chatStatus: body.chatStatus,
      },
    });
    if (!outcome.ok) {
      return res.status(outcome.statusCode).json({ success: false, message: outcome.message });
    }
    return successResponse(
      res,
      {
        id: req.params.id,
        status: outcome.quotation?.status,
        conversation: outcome.quotation?.conversation,
      },
      outcome.message
    );
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error updating conversation state' });
  }
});

// POST /api/v1/crm/quotations/:id/send
crmQuotationsRouter.post('/:id/send', async (req, res) => {
  try {
    const id = req.params.id;
    const actor = getActor(req);
    const body = req.body || {};
    const via = (body.via || 'email') as 'email' | 'whatsapp' | 'voice';
    const recipient = String(body.recipient || '');
    const cc = String(body.cc || '');
    const sender = String(body.sender || '');
    const templateName = String(body.template || '');
    const subject = String(body.subject || `ENSIS Quotation ${id}`);
    const message = String(body.message || '');
    const isDraft = Boolean(body.draft);

    const existing = await QuotationModel.findOne({ id, isDeleted: { $ne: true } }).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (isDraft) {
      await QuotationModel.findOneAndUpdate(
        { id },
        {
          $set: {
            sentVia: via,
            sentTo: recipient,
            sentCc: cc,
            sentSubject: subject,
            sentMessage: message,
          },
        }
      );
      return successResponse(res, { id, status: existing.status, draft: true }, 'Send draft saved');
    }

    // Enforce all completeness, channel eligibility, stop-aware, and ownership checks before final send
    const readiness = await evaluateSendReadiness({
      quotation: existing,
      via,
      recipient,
      sender,
      templateName,
      actor,
      expectedOwnershipVersion: body.ownershipVersion !== undefined ? Number(body.ownershipVersion) : undefined,
    });

    if (!readiness.ready) {
      const taskId = await createCostingOrReviewTask({
        quotationId: id,
        clientName: existing.client?.name || 'Client',
        blockers: readiness.blockers,
        requestedBy: actor.name,
      });

      const reasonMessages = readiness.blockers.map((b) => b.message);
      await QuotationModel.findOneAndUpdate(
        { id },
        {
          $set: {
            sendBlockedReasons: reasonMessages,
            ...(taskId ? { costingTaskId: taskId } : {}),
          },
        }
      );

      const hasOwnershipConflict = readiness.blockers.some((b) => b.code === 'OWNERSHIP_CONFLICT');
      const primaryMessage = reasonMessages[0] || 'Final send blocked until quotation checks are complete.';
      const fullMessage = taskId
        ? `${primaryMessage} (Owned task ${taskId} created)`
        : primaryMessage;

      return res.status(hasOwnershipConflict ? 409 : 422).json({
        success: false,
        message: fullMessage,
        error: fullMessage,
        costingTaskId: taskId,
        blockers: readiness.blockers,
      });
    }

    const prevVersion = Number(existing.conversation?.ownershipVersion ?? 1);
    const nextVersion = prevVersion + 1;
    const prevFreq = Number(existing.conversation?.frequencyCount24h ?? 0);
    const traceEntry = {
      at: new Date().toISOString(),
      by: actor.name,
      role: actor.crmRole,
      via,
      recipient,
      template: templateName || 'Default',
      sender: sender || undefined,
      revision: existing.revision || 1,
      ownershipVersion: nextVersion,
      status: 'sent',
    };

    const existingConv = existing.conversation || {
      ownerType: 'human',
      ownerName: existing.owner || actor.name,
      ownershipVersion: 1,
      humanTakeover: false,
      replied: false,
      optedOutChannels: [],
      frequencyCount24h: 0,
      chatStatus: 'open',
      resolvedIsNotWonSale: true,
      orderConfirmed: false,
    };

    await QuotationModel.findOneAndUpdate(
      { id },
      {
        $set: {
          status: 'Sent',
          sentVia: via,
          sentTo: recipient,
          sentCc: cc,
          sentAt: traceEntry.at,
          sentSubject: subject,
          sentMessage: message,
          sendBlockedReasons: [],
          conversation: {
            ...existingConv,
            ownerType: 'human',
            ownerName: actor.name,
            ownershipVersion: nextVersion,
            frequencyCount24h: prevFreq + 1,
            lastOutboundAt: traceEntry.at,
          },
        },
        $push: {
          deliveryTrace: traceEntry,
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
        by: actor.name || body.sender || 'Sales Team',
        text: `Quotation ${id} sent via ${via === 'whatsapp' ? 'WhatsApp' : 'Email'} to ${recipient}`,
        module: 'Sales',
      };
      await CrmRecord.findOneAndUpdate(
        { key: 'dashboard.activities' },
        { key: 'dashboard.activities', data: [newActivity, ...currentActivities] },
        { upsert: true, new: true }
      );
    } catch {
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

    return successResponse(
      res,
      { id, status: 'Sent', ownershipVersion: nextVersion, deliveryTrace: traceEntry },
      'Quotation sent successfully'
    );
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error sending quotation' });
  }
});

// POST /api/v1/crm/quotations/:id/approve
crmQuotationsRouter.post('/:id/approve', async (req, res) => {
  try {
    const id = req.params.id;
    const actor = getActor(req);
    const existing = await QuotationModel.findOne({ id, isDeleted: { $ne: true } }).lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (actor.roleTier === 'user') {
      return res.status(403).json({
        success: false,
        message: 'Staff users cannot approve quotations. Request approval from a Sales Manager or Super Admin.',
      });
    }

    const pricingConfig = await getApprovedPricingConfig();
    const calc = calculateQuotationTotals(existing, pricingConfig);
    const isSelfQuote = (existing.owner || '').toLowerCase() === actor.name.toLowerCase();

    if (actor.roleTier === 'manager') {
      if (isSelfQuote) {
        return res.status(403).json({
          success: false,
          message: 'Managers cannot self-approve their own quotation submission. Route to Super Admin or peer reviewer.',
        });
      }
      if (calc.discountPercent > pricingConfig.managerDiscountLimitPercent) {
        return res.status(403).json({
          success: false,
          message: `Discount (${calc.discountPercent}%) exceeds Manager limit (${pricingConfig.managerDiscountLimitPercent}%). Super Admin approval required.`,
        });
      }
    }

    const hash = computeSpecHash(existing);
    await QuotationModel.findOneAndUpdate(
      { id },
      {
        $set: {
          status: 'Approved',
          approvalStatus: 'Approved',
          approvedBy: actor.name,
          reviewer: actor.name,
          approvedAt: new Date().toISOString(),
          approvedSnapshotHash: hash,
          specChanged: false,
          sendBlockedReasons: [],
        },
      },
      { new: true }
    );

    return successResponse(
      res,
      { id, status: 'Approved', approvalStatus: 'Approved', approvedBy: actor.name, approvedSnapshotHash: hash },
      'Quotation approved successfully'
    );
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error approving quotation' });
  }
});

// POST /api/v1/crm/quotations/:id/revisions
crmQuotationsRouter.post('/:id/revisions', async (req, res) => {
  try {
    const id = req.params.id;
    const actor = getActor(req);
    const body = req.body || {};
    const existing = await QuotationModel.findOne({ id });
    const pricingConfig = await getApprovedPricingConfig();
    const calc = calculateQuotationTotals(
      {
        lines: body.lines || existing?.lines || [],
        discount: body.discount ?? existing?.discount,
        shipping: body.shipping ?? existing?.shipping,
        installation: body.installation ?? existing?.installation,
        advancePercent: body.advancePercent ?? existing?.advancePercent,
      },
      pricingConfig
    );

    const nextRevision = (existing?.revision || 1) + 1;
    const revisions = existing?.revisions ? [...existing.revisions] : [];
    revisions.push({
      revision: existing?.revision || 1,
      total: existing?.totalAmount || calc.total,
      createdOn: new Date().toLocaleDateString('en-IN'),
      createdBy: existing?.owner || actor.name || 'Simran Kaur',
    });

    await QuotationModel.findOneAndUpdate(
      { id },
      {
        $set: {
          ...body,
          revision: nextRevision,
          status: 'Revision Draft',
          approvalStatus: 'Not submitted',
          approvedBy: '',
          approvedSnapshotHash: '',
          specChanged: false,
          totalAmount: calc.total,
          revisions,
        },
      },
      { new: true }
    );

    return successResponse(res, { id, revision: nextRevision, totals: calc }, 'Revision created', 201);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error creating revision' });
  }
});
