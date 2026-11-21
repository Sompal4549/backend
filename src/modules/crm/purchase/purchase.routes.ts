import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';

export const crmPurchaseRouter = Router();

const mockPurchaseRequest = {
  id: 'PR-2026-0030',
  requestDate: '2026-11-16',
  requiredDate: '2026-11-20',
  priority: 'High',
  requestedBy: 'Mohit Gupta',
  department: 'Production',
  relatedJob: 'JB0090 / SO0090',
  warehouse: 'WH-A',
  vendor: 'Wellness Components',
  reason: 'Prevent production delay and restore stock.',
  lines: [
    { id: 'l1', name: 'Steam Controller SC08', spec: 'Steam Controller SC08', available: 4, jobNeed: 5, buffer: 4, qty: 5, unit: 'Nos.', rate: 8000 },
  ],
  attachments: [{ name: 'SC08_Specifications.pdf', size: '1.2 MB' }],
  notes: '',
};

const mockPurchaseOrder = {
  id: 'PO-2026-0070',
  poDate: '2026-11-17',
  dueDate: '2026-11-20',
  approvalStatus: 'Draft',
  workflow: 'Super Admin',
  fromRequest: 'PR0030 (Approved)',
  linkedJob: 'JB0090',
  purpose: 'Stock replenishment',
  supplier: 'WellnessComponents',
  contact: 'Karan Mehra',
  phone: '+91 98222 11100',
  email: 'karan@wellnesscomponents.in',
  deliverTo: 'WH-A – Ghaziabad',
  deliveryAddress: 'ENSIS Warehouse – WH-A\nGhaziabad, Uttar Pradesh',
  lines: [
    { id: 'p1', itemId: 'SC08', name: 'Steam Controller', spec: 'Standard', qty: 5, unit: 'Nos.', rate: 8000, discount: 0, gst: 18 },
  ],
  subtotal: 40000,
  gst: 7200,
  total: 47200,
  leadTime: '3-5 working days',
  paymentTerms: '50% advance, balance against delivery',
  terms: 'Supply as per approved material request PR0030. Deliver to WH-A – Ghaziabad by the due date.',
  paymentSplit: [
    { label: '50% advance', percent: 50 },
    { label: '50% after receipt', percent: 50 },
  ],
  linkToJob: true,
  forStock: true,
  attachments: [{ name: 'PR0030_Approved.pdf', size: '284 KB' }],
  notes: '',
};

const mockVendor = {
  id: 'VND-0082',
  name: 'Wellness Components',
  contactPerson: 'Karan Mehra',
  phone: '+91 98222 11100',
  email: 'karan@wellnesscomponents.in',
  city: 'Delhi',
  category: 'Electrical & Controllers',
  gstin: '07BBBBB1111B1Z2',
  pan: 'BBBBB1111B',
  rating: '4.8 / 5',
  paymentTerms: '30 Days Net',
};

const mockGRN = {
  id: 'GRN-2026-0045',
  poId: 'PO-2026-0070',
  source: 'Purchase Order',
  poNumber: 'PO-2026-0070',
  vendor: 'Wellness Components',
  date: '2026-11-20',
  receivedDate: '2026-11-20',
  challanNo: 'DC-8812',
  vehicleNo: 'DL-1L-4412',
  receivedBy: 'Ramesh Singh',
  receiver: 'Amit',
  warehouse: 'WH-A',
  invoiceNo: 'BILL0104',
  reference: '',
  lines: [
    { id: 'g1', sku: 'SC08', name: 'Steam Controller', ordered: 5, previouslyReceived: 0, receiving: 5, accepted: 5, rejected: 0, inspection: 'Accepted', cost: 8000, preStock: 12 },
  ],
  rejectionReason: '',
  attachments: [{ name: 'Delivery Challan.pdf', size: '372 KB' }],
  storageLocation: 'Rack A2',
  status: 'Completed',
};

const purchaseOverview = {
  kpis: { openRequests: 9, approvalPending: 3, openPOs: 4, deliveriesLate: 2 },
  requests: [
    {
      id: 'PR-0024',
      linkedTo: 'JB-0086',
      material: 'Brass fittings',
      requestedBy: 'Amit Kumar',
      requiredDate: '15 Oct 2026',
      estimate: '₹18,000.00',
      status: { label: 'Awaiting approval', tone: 'warning', icon: 'clock' },
      action: 'Review',
    },
    {
      id: 'PR-0025',
      linkedTo: 'PJ-0018',
      material: 'Installation hardware',
      requestedBy: 'Sandeep Kumar',
      requiredDate: '16 Oct 2026',
      estimate: '₹12,500.00',
      status: { label: 'PO issued', tone: 'success', icon: 'check' },
      action: 'View PO',
    },
    {
      id: 'PR-0026',
      linkedTo: 'JB-0087',
      material: 'Teak wood',
      requestedBy: 'Rajesh Kumar',
      requiredDate: '17 Oct 2026',
      estimate: '₹42,000.00',
      status: { label: 'Sourcing', tone: 'info', icon: 'sync' },
      action: 'View',
    },
    {
      id: 'PR-0027',
      linkedTo: 'JB-0088',
      material: 'Steam controller',
      requestedBy: 'Amit Kumar',
      requiredDate: '14 Oct 2026',
      estimate: '₹24,000.00',
      status: { label: 'Supplier delayed', tone: 'danger', icon: 'alert' },
      action: 'Review',
    },
  ],
  commitments: [
    {
      vendor: 'Raj Traders',
      material: 'Brass fittings',
      expected: '15 Oct 2026 10:00 AM',
      status: { label: 'Confirmed', tone: 'success', icon: 'check' },
    },
    {
      vendor: 'Wellness Components',
      material: 'Steam controller',
      expected: '13 Oct 2026',
      status: { label: 'Overdue 1 day', tone: 'danger', icon: 'alert' },
    },
  ],
  approvals: [
    {
      type: 'Purchase request',
      ref: 'PR-0024',
      amount: '₹18,000.00',
      requestedBy: 'Amit Kumar',
      approver: 'Vijay Sharma',
    },
    {
      type: 'Advance payment',
      ref: 'AP-0012',
      amount: '₹30,000.00',
      requestedBy: 'Sandeep Kumar',
      approver: 'Vijay Sharma',
    },
  ],
  purchaseOrders: [
    {
      id: 'PO-0068',
      vendor: 'Wellness Components',
      linkedTo: 'JB-0087',
      total: '₹42,000.00',
      orderDate: '10 Oct 2026',
      expected: '17 Oct 2026',
      received: '40% (20 / 50)',
      status: { label: 'Part received', tone: 'info', icon: 'sync' },
    },
    {
      id: 'PO-0069',
      vendor: 'Raj Traders',
      linkedTo: 'JB-0086',
      total: '₹18,000.00',
      orderDate: '12 Oct 2026',
      expected: '15 Oct 2026',
      received: '0% (0 / 50)',
      status: { label: 'Confirmed', tone: 'success', icon: 'check' },
    },
  ],
};

crmPurchaseRouter.get('/overview', (_req, res) => {
  successResponse(res, purchaseOverview, 'Purchase overview retrieved');
});

crmPurchaseRouter.get('/requests/new', (_req, res) => {
  successResponse(res, mockPurchaseRequest, 'New purchase request draft');
});

crmPurchaseRouter.get('/orders/new', (_req, res) => {
  successResponse(res, mockPurchaseOrder, 'New purchase order draft');
});

crmPurchaseRouter.get('/vendors/new', (_req, res) => {
  successResponse(res, mockVendor, 'New vendor draft');
});

crmPurchaseRouter.get('/receipts/new', (_req, res) => {
  successResponse(res, mockGRN, 'New GRN draft');
});

crmPurchaseRouter.get('/receipts/:id', (req, res) => {
  successResponse(res, { ...mockGRN, id: req.params.id }, 'GRN details retrieved');
});

crmPurchaseRouter.get('/inventory/snapshot', (_req, res) => {
  const snapshot = {
    warehouse: 'WH-A Ghaziabad',
    updatedAt: new Date().toISOString(),
    totalValuation: '₹48,60,000.00',
    items: [
      { sku: 'BRS-TBL-01', name: 'Brass Casting Plate', inStock: 42, reorderLevel: 10, unit: 'pcs', rate: 1200 },
      { sku: 'TK-WOD-02', name: 'Seasoned Teak Planks', inStock: 120, reorderLevel: 25, unit: 'sqft', rate: 350 },
      { sku: 'SC-08', name: 'Steam Controller', inStock: 4, reorderLevel: 5, unit: 'Nos.', rate: 8000 },
    ],
  };
  successResponse(res, snapshot, 'Stock snapshot retrieved');
});

export default crmPurchaseRouter;
