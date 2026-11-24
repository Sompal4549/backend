import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';
import { generateDocumentNumber } from '../../../utils/document-series.util';

export const crmQuotationsRouter = Router();

const baseLines = [
  { id: 'l1', name: 'Steam Chamber', spec: 'Standard model', qty: 2, unit: 'Nos.', rate: 60000, discount: 0, gst: 18 },
  { id: 'l2', name: 'Therapy Table', spec: 'Standard model', qty: 1, unit: 'Nos.', rate: 45000, discount: 0, gst: 18 },
  { id: 'l3', name: 'Shirodhara Stand', spec: 'Adjustable stand', qty: 2, unit: 'Nos.', rate: 12500, discount: 0, gst: 18 },
];

const mockQuotation = {
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
};

const mockSalesOrder = {
  id: 'SO-2026-0090',
  status: 'In Production',
  quotationId: 'QT-2026-0130',
  quotationRevision: 2,
  orderDate: '2026-11-17',
  client: 'Aarogya Ayurveda',
  clientContact: 'Dr. Neha Verma',
  city: 'Jaipur',
  businessType: 'Equipment',
  owner: 'Simran Kaur',
  value: 204350,
  targetDispatchDate: '2026-12-05',
  deliveryAddress: 'Aarogya Ayurveda, Tonk Road, Jaipur',
  paymentTerms: '50% advance (paid), 50% against PI before dispatch',
  lines: baseLines,
  productionProgress: 45,
  siteVisitRequired: false,
};

crmQuotationsRouter.get('/overview', (_req, res) => {
  const quotationsOverview = {
    kpis: { drafts: 5, awaitingApproval: 2, sentThisMonth: 12, confirmedOrders: 8 },
    quotations: [
      { id: 'QT-0124', client: 'Aarogya Ayurveda', businessType: 'Equipment', value: '₹2.4L', revision: 'Rev 1', owner: 'Simran Kaur', status: { label: 'Accepted', tone: 'success' }, action: 'View' },
      { id: 'QT-0125', client: 'Serene Resort', businessType: 'Turnkey', value: '₹3.4L', revision: 'Rev 2', owner: 'Amit Mehta', status: { label: 'Sent', tone: 'info' }, action: 'View' },
      { id: 'QT-0126', client: 'Healing Centre', businessType: 'Consultancy', value: '₹1.6L', revision: 'Rev 1', owner: 'Ritu Sharma', status: { label: 'Awaiting approval', tone: 'warning' }, action: 'Review' },
      { id: 'QT-0127', client: 'Wellness Spa', businessType: 'Equipment', value: '₹1.8L', revision: 'Rev 1', owner: 'Amit Mehta', status: { label: 'Draft', tone: 'neutral' }, action: 'Edit' },
      { id: 'QT-0128', client: 'Ayurveda Care', businessType: 'Equipment', value: '₹2.1L', revision: 'Rev 2', owner: 'Simran Kaur', status: { label: 'Negotiation', tone: 'danger' }, action: 'View' },
    ],
    approvals: [
      { id: 'QT-0126', client: 'Healing Centre', reason: 'Discount 8% (vs standard 5%)', requires: 'Requires Sales Manager approval', requestedBy: 'Ritu Sharma', requestedAt: '14 Oct 2026, 11:20 AM' },
      { id: 'QT-0128', client: 'Ayurveda Care', reason: 'Payment term exception', requires: 'Requires Management approval', requestedBy: 'Simran Kaur', requestedAt: '14 Oct 2026, 09:45 AM' },
    ],
    confirmedOrders: [
      { id: 'SO-0086', client: 'Aarogya Ayurveda', fromQuotation: 'QT-0124', value: '₹2.4L', status: 'In Production', orderDate: '14 Oct 2026', owner: 'Simran Kaur' },
    ],
  };
  successResponse(res, quotationsOverview, 'Quotations overview retrieved');
});

crmQuotationsRouter.get('/new', (_req, res) => {
  successResponse(res, { ...mockQuotation, id: generateDocumentNumber('estimate', Math.floor(Math.random() * 800 + 100)) }, 'New quotation draft');
});

crmQuotationsRouter.get('/:id', (req, res) => {
  successResponse(res, { ...mockQuotation, id: req.params.id }, 'Quotation retrieved');
});

crmQuotationsRouter.post('/', (_req, res) => {
  successResponse(res, { id: generateDocumentNumber('estimate', 131) }, 'Quotation created', 201);
});

crmQuotationsRouter.put('/:id', (req, res) => {
  successResponse(res, { id: req.params.id, ...req.body }, 'Quotation updated');
});

crmQuotationsRouter.post('/:id/send', (req, res) => {
  successResponse(res, { id: req.params.id }, 'Quotation sent');
});

crmQuotationsRouter.post('/:id/revisions', (req, res) => {
  successResponse(res, { ...mockQuotation, id: req.params.id, revision: 2 }, 'Revision created', 201);
});

// Sales Orders
crmQuotationsRouter.get('/sales-orders/:id', (req, res) => {
  successResponse(res, { ...mockSalesOrder, id: req.params.id }, 'Sales order retrieved');
});

crmQuotationsRouter.post('/sales-orders', (_req, res) => {
  successResponse(res, { id: generateDocumentNumber('sales order', 91) }, 'Sales order created', 201);
});

crmQuotationsRouter.put('/sales-orders/:id', (req, res) => {
  successResponse(res, { id: req.params.id }, 'Sales order updated');
});
