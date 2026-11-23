import { Router } from 'express';
import { successResponse } from '../../utils/api-response';

import { crmAuthRouter } from './auth/auth.routes';
import { crmMeRouter } from './auth/me.routes';
import { crmAuthController } from './auth/auth.controller';

import { crmDashboardRouter } from './dashboard/dashboard.routes';
import { getCompanyDashboard } from './dashboard/dashboard.controller';

import { crmLeadsRouter } from './leads/leads.routes';
import { getLeadsOverview, getLead, createLead, getImports, previewImport } from './leads/leads.controller';

import { crmOpportunitiesRouter } from './opportunities/opportunities.routes';
import { getPipeline, getOpportunity, createOpportunity, updateOpportunity, updateStage, logActivity } from './opportunities/opportunities.controller';

import { crmClientsRouter } from './clients/clients.routes';
import { getClientsOverview, getClient, createClient, updateClient } from './clients/clients.controller';

import { crmAccountsRouter } from './accounts/accounts.routes';
import { crmTeamRouter } from './team/team.routes';
import { crmServiceRouter } from './service/service.routes';
import { crmQuotationsRouter } from './quotations/quotations.routes';
import { crmProjectsRouter } from './projects/projects.routes';
import { crmProductionRouter } from './production/production.routes';
import { crmPurchaseRouter } from './purchase/purchase.routes';
import { crmInventoryRouter } from './inventory/inventory.routes';
import { crmMarketingRouter } from './marketing/marketing.routes';
import { crmTasksRouter, getWorkOverviewHandler } from './tasks/tasks.routes';
import { crmReportsRouter } from './reports/reports.routes';
import { crmSettingsRouter } from './settings/settings.routes';
import { crmTopbarRouter } from './topbar/topbar.routes';
import { crmRecordsRouter } from './records/records.routes';
import { crmWorkflowsRouter } from './workflows/workflows.routes';

export const crmRouter = Router();

// ─── CRM Authentication & Staff Identity ─────────────────────────────────────
crmRouter.use('/auth', crmAuthRouter);
crmRouter.use(crmMeRouter);

// Users list endpoint
crmRouter.get('/users', async (_req, res) => {
  try {
    const { UserModel } = await import('../../models/user.model');
    const users = await UserModel.find({ isDeleted: { $ne: true } })
      .select('name email phone role avatar employeeId createdAt updatedAt')
      .lean();

    const items = users.map((u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role || 'sales_executive',
      avatar: u.avatar || '',
      employeeId: u.employeeId || '',
      status: { label: 'Active', tone: 'success' },
      createdAt: u.createdAt,
    }));

    return successResponse(res, items, 'Users list retrieved');
  } catch (err: any) {
    return successResponse(res, [], 'Users retrieved');
  }
});

crmRouter.get('/users/:userId', crmAuthController.getUserById);

// Products list endpoint
crmRouter.get('/products', async (_req, res) => {
  try {
    const { ProductModel } = await import('../../models/product.model');
    const products = await ProductModel.find({ isDeleted: { $ne: true } })
      .select('title name sku price priceDiscount stock status category')
      .limit(100)
      .lean();

    const items = products.map((p: any) => ({
      id: p._id.toString(),
      name: p.title || p.name || 'Product',
      sku: p.sku || `SKU-${p._id.toString().slice(-4)}`,
      rate: p.priceDiscount || p.price || 0,
      stock: p.stock || 0,
      category: p.category || 'Standard',
      status: { label: 'In stock', tone: 'success' },
    }));

    return successResponse(res, items, 'Products list retrieved');
  } catch {
    return successResponse(res, [], 'Products retrieved');
  }
});

// Roles list endpoint
crmRouter.get('/roles', async (_req, res) => {
  return successResponse(
    res,
    [
      { id: 'superadmin', name: 'Super Admin', permissions: ['all'] },
      { id: 'admin', name: 'Admin', permissions: ['all'] },
      { id: 'sales_manager', name: 'Sales Manager', permissions: ['sales', 'leads', 'clients', 'quotations'] },
      { id: 'sales_executive', name: 'Sales Executive', permissions: ['leads', 'clients', 'quotations'] },
      { id: 'production_manager', name: 'Production Manager', permissions: ['production', 'inventory'] },
      { id: 'project_engineer', name: 'Project Engineer', permissions: ['projects', 'siteVisits'] },
      { id: 'procurement_manager', name: 'Procurement Manager', permissions: ['purchase', 'inventory'] },
      { id: 'finance_manager', name: 'Finance Manager', permissions: ['accounts', 'invoices', 'payments'] },
      { id: 'service_engineer', name: 'Service Engineer', permissions: ['service', 'tickets'] },
    ],
    'Roles list retrieved'
  );
});

// Units list endpoint
crmRouter.get('/units', (_req, res) => {
  successResponse(
    res,
    [
      { id: 'pcs', code: 'pcs', name: 'Pieces' },
      { id: 'sets', code: 'sets', name: 'Sets' },
      { id: 'sqft', code: 'sqft', name: 'Square Feet' },
      { id: 'kg', code: 'kg', name: 'Kilograms' },
      { id: 'mtr', code: 'mtr', name: 'Meters' },
      { id: 'nos', code: 'nos', name: 'Numbers' },
      { id: 'box', code: 'box', name: 'Boxes' },
    ],
    'Units retrieved'
  );
});

// Workflows, Integrations, Notifications endpoints
crmRouter.get('/workflows/definitions', (_req, res) => {
  successResponse(
    res,
    [
      { id: 'wf-1', name: 'Quotation Approval', entity: 'quotations', steps: ['Manager Review', 'Director Sign-off'], active: true },
      { id: 'wf-2', name: 'Purchase Order Approval', entity: 'purchase', steps: ['Finance Review', 'Admin Approval'], active: true },
      { id: 'wf-3', name: 'Dispatch Release', entity: 'production', steps: ['QC Check', 'Billing Cleared'], active: true },
    ],
    'Workflow definitions retrieved'
  );
});

crmRouter.get('/integrations', (_req, res) => {
  successResponse(
    res,
    [
      { id: 'int-1', provider: 'WhatsApp Business', status: 'connected', events: ['lead.created', 'quotation.sent'] },
      { id: 'int-2', provider: 'Email SMTP', status: 'connected', events: ['invoice.created', 'password.reset'] },
      { id: 'int-3', provider: 'Payment Gateway', status: 'connected', events: ['payment.received'] },
    ],
    'Integrations retrieved'
  );
});

crmRouter.get('/notifications', (_req, res) => {
  successResponse(
    res,
    [
      { id: 'notif-1', title: 'New lead assigned', unread: true, timestamp: new Date().toISOString() },
      { id: 'notif-2', title: 'Quotation approved by client', unread: false, timestamp: new Date().toISOString() },
    ],
    'Notifications retrieved'
  );
});

// ─── 1. Dashboard ─────────────────────────────────────────────────────────────
crmRouter.use('/dashboard', crmDashboardRouter);
crmRouter.get('/dashboard/company', getCompanyDashboard);

// ─── 2. Leads & Opportunities ────────────────────────────────────────────────
crmRouter.get('/leads/overview', getLeadsOverview);
crmRouter.get('/leads/imports', getImports);
crmRouter.post('/leads/imports/preview', previewImport);
crmRouter.get('/leads/:id', getLead);
crmRouter.post('/leads', createLead);
crmRouter.use('/leads', crmLeadsRouter);

crmRouter.get('/opportunities/pipeline', getPipeline);
crmRouter.get('/opportunities/:id', getOpportunity);
crmRouter.post('/opportunities', createOpportunity);
crmRouter.post('/opportunities/:id/activities', logActivity);
crmRouter.patch('/opportunities/:id/stage', updateStage);
crmRouter.put('/opportunities/:id', updateOpportunity);
crmRouter.use('/opportunities', crmOpportunitiesRouter);

// ─── 3. Clients ───────────────────────────────────────────────────────────────
crmRouter.get('/clients/overview', getClientsOverview);
crmRouter.get('/clients/:id', getClient);
crmRouter.post('/clients', createClient);
crmRouter.put('/clients/:id', updateClient);
crmRouter.use('/clients', crmClientsRouter);

// ─── 4. Management & Finance ──────────────────────────────────────────────────
crmRouter.use('/accounts', crmAccountsRouter);
crmRouter.use('/team', crmTeamRouter);
crmRouter.use('/service', crmServiceRouter);
crmRouter.use('/reports', crmReportsRouter);

// ─── 5. Sales & Marketing ─────────────────────────────────────────────────────
crmRouter.use('/quotations', crmQuotationsRouter);
crmRouter.use('/marketing', crmMarketingRouter);

// ─── 6. Operations & Logistics ────────────────────────────────────────────────
crmRouter.get('/projects/timeline', (_req, res) => successResponse(res, projectsTimelineData, 'Projects timeline retrieved'));
crmRouter.use('/projects', crmProjectsRouter);
crmRouter.use('/production', crmProductionRouter);
crmRouter.use('/purchase', crmPurchaseRouter);
crmRouter.use('/inventory', crmInventoryRouter);
crmRouter.use('/tasks', crmTasksRouter);

// ─── 7. Configuration & Platform Utilities ────────────────────────────────────
crmRouter.use('/settings', crmSettingsRouter);
crmRouter.use('/topbar', crmTopbarRouter);
crmRouter.use(crmTopbarRouter);
crmRouter.use('/records', crmRecordsRouter);
crmRouter.use('/workflows', crmWorkflowsRouter);

// ─── DIRECT HANDLERS FOR TOP-LEVEL FRONTEND SERVICE ENDPOINTS ───────────────────
// Config-driven modal form submissions:
crmRouter.post('/forms/:formId', (req, res) => {
  const formId = req.params.formId;
  const prefix = formId.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'FRM';
  successResponse(
    res,
    { id: `${prefix}-${Date.now().toString().slice(-4)}`, formId, data: req.body },
    `Form ${formId} submitted successfully`,
    201
  );
});

// Reschedule endpoints:
crmRouter.post('/tasks/:id/reschedule', (req, res) => {
  successResponse(res, { id: req.params.id, ...req.body }, 'Task rescheduled successfully');
});
crmRouter.post('/follow-ups/:id/reschedule', (req, res) => {
  successResponse(res, { id: req.params.id, ...req.body }, 'Follow-up rescheduled successfully');
});

// Work / Tasks (NO 307 REDIRECTS - Direct 200 OK responses):
crmRouter.get('/work/overview', getWorkOverviewHandler);
crmRouter.get('/work', getWorkOverviewHandler);

const fullDailyReport = {
  date: new Date().toISOString().slice(0, 10),
  employee: 'Vijay Sharma',
  department: 'Executive Management',
  reviewer: 'Rajesh Kumar',
  assignedBy: 'Board of Directors',
  status: 'Submitted' as const,
  approval: 'Approved by Vijay Sharma',
  lines: [
    {
      id: 'r1',
      taskId: 'TK0148',
      activity: 'Quarterly sales review and forecast',
      plannedHours: 2,
      loggedHours: 2,
      status: 'Completed' as const,
      completion: 100,
      remarks: 'Quarterly review complete. Sales target on track.',
    },
    {
      id: 'r2',
      taskId: 'TK0150',
      activity: 'Approve pending quotations and discount requests',
      plannedHours: 2,
      loggedHours: 2,
      status: 'Completed' as const,
      completion: 100,
      remarks: 'QT-0126 and QT-0130 approvals finalized.',
    },
    {
      id: 'r3',
      taskId: 'TK0151',
      activity: 'Finalize production schedule for November',
      plannedHours: 2,
      loggedHours: 2,
      status: 'Completed' as const,
      completion: 100,
      remarks: 'Reviewed with production lead Rajesh Kumar.',
    },
    {
      id: 'r4',
      taskId: 'TK0152',
      activity: 'Key client check-in (Aarogya Ayurveda)',
      plannedHours: 1.5,
      loggedHours: 1.5,
      status: 'Completed' as const,
      completion: 100,
      remarks: 'Discussed turnkey delivery timeline.',
    },
    {
      id: 'r5',
      taskId: 'TK0153',
      activity: 'Staff capacity and allocation review',
      plannedHours: 1,
      loggedHours: 1,
      status: 'In Progress' as const,
      completion: 60,
      remarks: 'Ongoing review with HR.',
    },
  ],
  achievements: '• Quarterly forecast finalized.\n• Approved 3 key high-value quotations.\n• Production schedule aligned for dispatch deadlines.',
  blockers: 'None.',
  support: {
    from: 'Operations',
    person: 'Rajesh Kumar',
    details: 'Ensure factory dispatch follows the agreed schedule.',
  },
  nextDayPlan: '• Review pending site surveys.\n• Team milestone standup meeting.\n• Vendor negotiations for raw brass fittings.',
  reviewerRemarks: 'Outstanding work today. All priorities completed on time.',
  attachments: [
    { name: 'Daily_Report_Summary.pdf', size: '1.1 MB' },
  ],
};

crmRouter.get('/daily-reports/today', (_req, res) => {
  successResponse(res, fullDailyReport, 'Today daily report');
});
crmRouter.post('/daily-reports', (_req, res) => {
  successResponse(res, { ok: true, message: 'Daily report submitted' }, 'Daily report submitted', 201);
});

// Operations & Facilities:
crmRouter.get('/site-visits/new', (_req, res) =>
  successResponse(res, { id: 'SV-NEW', site: 'Jaipur', date: new Date().toISOString().slice(0, 10), engineer: 'Sandeep Kumar' }, 'New site visit')
);
crmRouter.get('/dispatches/new', (_req, res) =>
  successResponse(
    res,
    {
      id: 'DS-2026-0047',
      salesOrder: 'SO-0090',
      jobId: 'JB-0090',
      client: 'Aarogya Ayurveda',
      qcStatus: 'QC Passed',
      unitsReleased: 5,
      dispatchDate: new Date().toISOString().slice(0, 10),
      deliveryExpected: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      siteAddress: 'Aarogya Ayurveda, Tonk Road, Jaipur',
      contactPerson: 'Dr. Neha Verma',
      contactNumber: '+91 98765 43210',
      lines: [
        { id: 'p1', name: 'Steam Chamber', spec: 'Standard model', ordered: 2, packed: 2, dispatched: 2, qc: 'QC Passed' },
        { id: 'p2', name: 'Therapy Table', spec: 'Standard model', ordered: 1, packed: 1, dispatched: 1, qc: 'QC Passed' },
        { id: 'p3', name: 'Shirodhara Stand', spec: 'Adjustable stand', ordered: 2, packed: 2, dispatched: 2, qc: 'QC Passed' },
      ],
      transporter: 'SafeExpress Logistics',
      vehicleNo: 'RJ-14-GA-9021',
      lrNumber: 'LR-882910',
      freight: 3500,
      paidBy: 'Company',
      responsible: 'Karan Singh',
      note: 'Handle with care. Fragile electronic temperature controls included.',
      attachments: [{ name: 'Packing_List_DS-2026-0047.pdf', size: '245 KB' }],
    },
    'New dispatch'
  )
);
crmRouter.get('/vendors/new', (_req, res) =>
  successResponse(res, { id: 'VND-NEW', name: 'New Vendor', rating: '5 / 5' }, 'New vendor')
);
crmRouter.get('/office-requests/new', (_req, res) =>
  successResponse(
    res,
    {
      id: 'OR-2026-0023',
      subject: 'PrinterMaintenance',
      type: 'Maintenance',
      branch: 'Ghaziabad',
      raisedBy: 'Simran Kaur',
      assignedTo: 'Kiran Sharma',
      priority: 'Normal',
      raisedOn: new Date().toISOString().slice(0, 10),
      due: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      estimate: 2500,
      status: 'Pending',
      description: 'Printer maintenance request.',
      vendor: '',
      quotation: [],
      checklist: [{ label: 'Inspect', done: true }, { label: 'Obtain estimate', done: false }],
      activityNotes: '',
      actualCost: 0,
      approvalBy: 'Vijay Sharma',
    },
    'New office request'
  )
);

// Records & Calendars:
const workCalendarData = [
  { id: 'ev1', title: 'Production review', date: new Date().toISOString().slice(0, 10), start: '11:00', end: '12:00', kind: 'review', owner: 'Rajesh Kumar', department: 'Production', reference: 'JB-0086' },
  { id: 'ev2', title: 'Client proposal discussion', date: new Date().toISOString().slice(0, 10), start: '12:30', end: '13:30', kind: 'call', owner: 'Simran Kaur', department: 'Sales', reference: 'EN-1042' },
  { id: 'ev3', title: 'Installation planning', date: new Date().toISOString().slice(0, 10), start: '15:00', end: '16:00', kind: 'meeting', owner: 'Sandeep Kumar', department: 'Projects', reference: 'PJ-0018' },
];

const serviceCalendarData = [
  { id: 'srv1', title: 'Aarogya Steam Chamber Check', date: new Date().toISOString().slice(0, 10), start: '10:00', end: '11:30', kind: 'service', owner: 'Udit Sharma', department: 'Service', reference: 'SR-0046' },
];

const projectsTimelineData = {
  from: '2026-09-21',
  to: '2026-12-20',
  today: new Date().toISOString().slice(0, 10),
  rows: [
    {
      id: 'PJ-0018',
      name: 'PJ-0018 · Serene Resort',
      subtitle: 'Installation · Goa',
      start: '2026-09-22',
      end: '2026-11-10',
      progress: 68,
      status: { label: 'At risk', tone: 'danger', icon: 'warning' },
      milestones: [
        { date: '2026-10-01', label: 'Equipment delivered', done: true },
        { date: '2026-10-17', label: 'Site readiness', done: false },
        { date: '2026-11-05', label: 'Handover', done: false },
      ],
    },
    {
      id: 'PJ-0019',
      name: 'PJ-0019 · Wellness Spa',
      subtitle: 'Execution · Kochi',
      start: '2026-10-01',
      end: '2026-11-25',
      progress: 45,
      status: { label: 'On track', tone: 'success', icon: 'check' },
      milestones: [
        { date: '2026-10-10', label: 'Electrical inspection', done: true },
        { date: '2026-10-20', label: 'Electrical works', done: false },
      ],
    },
  ],
};

const reportsCatalogData = [
  { key: 'monthly-sales-summary', title: 'Monthly Sales & Revenue Report', category: 'Sales' },
  { key: 'project-timeline-variance', title: 'Project Timeline Variance', category: 'Operations' },
  { key: 'inventory-aging', title: 'Inventory Aging Report', category: 'Supply Chain' },
];

crmRouter.get('/calendar/work', (_req, res) => successResponse(res, workCalendarData, 'Work calendar retrieved'));
crmRouter.get('/calendar/service', (_req, res) => successResponse(res, serviceCalendarData, 'Service calendar retrieved'));
crmRouter.get('/projects/timeline', (_req, res) => successResponse(res, projectsTimelineData, 'Projects timeline retrieved'));
crmRouter.get('/reports/catalog', (_req, res) => successResponse(res, reportsCatalogData, 'Reports catalog retrieved'));

// Sales orders:
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
  owner: 'Rajesh Kumar',
  dispatchDate: '2026-11-23',
  deliverySite: 'Jaipur',
  address: 'Tonk Road, Jaipur',
  value: 204350,
  targetDispatchDate: '2026-12-05',
  deliveryAddress: 'Aarogya Ayurveda, Tonk Road, Jaipur',
  paymentTerms: '50% advance (paid), 50% against PI before dispatch',
  lines: [
    { id: 'l1', name: 'Steam Chamber', spec: 'Standard model', qty: 2, unit: 'Nos.', rate: 65000, discount: 0, gst: 18 },
    { id: 'l2', name: 'Therapy Table', spec: 'Standard model', qty: 1, unit: 'Nos.', rate: 45000, discount: 0, gst: 18 },
    { id: 'l3', name: 'Shirodhara Stand', spec: 'Adjustable stand', qty: 2, unit: 'Nos.', rate: 12500, discount: 0, gst: 18 },
  ],
  discount: 10000,
  advancePercent: 50,
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
  productionProgress: 45,
  siteVisitRequired: false,
};

crmRouter.get('/sales-orders/:id', (req, res) => successResponse(res, { ...mockSalesOrder, id: req.params.id }, 'Sales order retrieved'));
crmRouter.post('/sales-orders', (_req, res) => successResponse(res, { id: 'SO-2026-0091' }, 'Sales order created', 201));
crmRouter.put('/sales-orders/:id', (req, res) => successResponse(res, { id: req.params.id }, 'Sales order updated'));

// Marketing aliases:
const campaignDraft = {
  code: 'CMP-2026-0018',
  name: 'Clinical Equipment Outreach',
  status: 'Draft',
  owner: 'Ritu Sharma',
  leadOwner: 'Simran',
  objective: 'Qualified equipment enquiries',
  expectedLeads: 60,
  audience: 'Ayurveda Clinics / Wellness Centres / Spas',
  regions: 'Delhi NCR / Jaipur / Mumbai',
  start: new Date().toISOString().slice(0, 10),
  end: '2026-11-30',
  channels: ['Meta Ads', 'Google Ads', 'Email'],
  budget: 18000,
  allocation: { 'Meta Ads': 8000, 'Google Ads': 7000, Email: 3000 },
  utm: { source: 'clinical_outreach', medium: 'paid_ads', campaign: 'cmp-2026-0018', content: 'equipment_creative', term: '' },
  landingUrl: 'https://ensis.in',
  integrationsConfigured: false,
  creative: { name: 'clinical_equipment_creative.jpg', size: '1.2 MB' },
  text: 'Advanced clinical equipment for Ayurveda and wellness spaces.',
  approver: 'Vijay Sharma',
};

const templateDraft = {
  id: 'TemplateEquipmentQuotationFollowup',
  name: 'QuoteFollowup',
  channel: 'Email',
  status: 'Draft',
  category: 'Sales Followup',
  sender: 'Not configured',
  language: 'English',
  subject: 'Following up on quotation {{quote_no}}',
  body: 'Hi {{client_name}},\n\nfollowing up on the ENSIS equipment quotation.\n\nRegards\n{{owner_name}}',
  variables: [
    { key: 'client_name', label: 'Client name', sample: 'Dr Neha' },
    { key: 'quote_no', label: 'Quotation number', sample: 'QT0130Rev2' },
  ],
};

crmRouter.get('/campaigns/new', (_req, res) => successResponse(res, campaignDraft, 'New campaign draft'));
crmRouter.get('/campaigns/:code', (req, res) => successResponse(res, { ...campaignDraft, code: req.params.code }, 'Campaign retrieved'));
crmRouter.get('/templates/new', (_req, res) => successResponse(res, templateDraft, 'New template draft'));
crmRouter.get('/templates/:id', (req, res) => successResponse(res, { ...templateDraft, id: req.params.id }, 'Template retrieved'));

// Topbar:
const mockApprovals = {
  totalAwaiting: '₹58,200.00',
  requests: [
    {
      id: 'QT-2026-0130 Rev1',
      type: 'quotation',
      typeLabel: 'Quotation Discount',
      amount: '₹10,000.00',
      requestedOn: '17 Nov 2026',
      age: '0 day',
      requestedBy: 'Simran Kaur',
      reason: 'Additional discount to close the order.',
      status: 'pending',
      assignedToMe: true,
      approver: 'Vijay Sharma',
      details: {
        client: 'Aarogya Ayurveda',
        linkedRecord: 'OP-2026-0061',
        documentNo: 'QT-2026-0130 Rev1',
        documentDate: '16 Nov 2026',
        summary: [{ label: 'Subtotal', value: '₹1,90,000.00' }, { label: 'Discount', value: '₹10,000.00' }, { label: 'Total', value: '₹2,12,400.00' }],
      },
    },
  ],
};

const mockFollowUps = [
  { id: 'fu-1', title: 'Dr. Neha Verma – Aarogya Ayurveda', dueTime: 'Today 2:00 PM', purpose: 'Floor plan and table delivery schedule discussion', status: 'Due Today', priority: 'High' },
  { id: 'fu-2', title: 'Rahul Mehta – Serene Resort', dueTime: 'Today 3:30 PM', purpose: 'Quotation review and revised BOQ submission', status: 'Due Today', priority: 'Medium' },
];

const mockNotifications = [
  { id: 'nt-1', title: 'New lead assigned', body: 'Lead from Website has been assigned to you.', time: '10 min ago', read: false },
  { id: 'nt-2', title: 'Quotation Approved', body: 'Discount approval granted for QT-2026-0130.', time: '1 hour ago', read: false },
];

crmRouter.get('/approvals', (_req, res) => successResponse(res, mockApprovals, 'Approvals retrieved'));
crmRouter.post('/approvals/:id/decision', (req, res) => successResponse(res, { id: req.params.id, status: req.body.decision || 'APPROVED' }, 'Decision recorded'));

crmRouter.get('/follow-ups', async (_req, res) => {
  try {
    const { LeadModel } = await import('../../models/lead.model');
    const leads = await LeadModel.find({ isDeleted: { $ne: true } }).limit(5).lean();
    const items = leads.map((l, idx) => ({
      id: `fu-${l._id}`,
      title: `${l.firstName || ''} ${l.lastName || ''} – ${l.companyName || 'Clinic'}`.trim(),
      dueTime: l.followUpDate ? `${l.followUpDate} ${l.followUpTime || ''}`.trim() : `Today ${2 + idx}:00 PM`,
      purpose: l.interestedProduct ? `Discussion regarding ${l.interestedProduct}` : 'Requirement review and quotation discussion',
      status: 'Due Today',
      priority: l.priority || 'High',
    }));
    return successResponse(res, items.length > 0 ? items : mockFollowUps, 'Follow-ups retrieved');
  } catch {
    return successResponse(res, mockFollowUps, 'Follow-ups retrieved');
  }
});

crmRouter.get('/notifications', async (_req, res) => {
  try {
    const { LeadModel } = await import('../../models/lead.model');
    const recentLeads = await LeadModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(3).lean();
    const items = recentLeads.map(l => ({
      id: `nt-${l._id}`,
      title: 'New Lead: ' + (`${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Website Visitor'),
      body: `Interested in ${l.interestedProduct || 'Ayurvedic equipment'} (${l.companyName || l.city || 'Delhi NCR'}).`,
      time: 'Recently',
      read: false,
    }));
    return successResponse(res, items.length > 0 ? items : mockNotifications, 'Notifications retrieved');
  } catch {
    return successResponse(res, mockNotifications, 'Notifications retrieved');
  }
});

crmRouter.post('/notifications/read', (_req, res) => successResponse(res, { ok: true }, 'Notifications marked read'));
crmRouter.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return successResponse(res, [], 'Search results');
    const regex = new RegExp(q, 'i');
    const { LeadModel } = await import('../../models/lead.model');
    const leads = await LeadModel.find({
      $or: [{ firstName: regex }, { lastName: regex }, { phone: regex }, { companyName: regex }]
    }).limit(8).lean();

    const results = leads.map(l => ({
      id: l._id.toString(),
      title: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Lead',
      type: 'lead',
      typeLabel: 'Lead',
      meta: l.phone || l.companyName || 'CRM Lead',
      href: `/sales/leads`,
      keywords: `${l.phone} ${l.companyName} ${l.city}`,
    }));
    return successResponse(res, results, 'Search results');
  } catch {
    return successResponse(res, [], 'Search results');
  }
});

// ─── MASTER LOOKUPS ENDPOINT ──────────────────────────────────────────────────
crmRouter.get('/lookups', async (_req, res) => {
  try {
    const { UserModel } = await import('../../models/user.model');
    const { LeadModel } = await import('../../models/lead.model');

    const users = await UserModel.find({})
      .select('name role email')
      .lean();
    const leads = await LeadModel.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const salesOwners = users.map(u => ({
      value: (u.name || '').toLowerCase().replace(/\s+/g, '-'),
      label: `${u.name || ''} · ${u.role || 'Staff'}`.trim(),
    }));

    const relationshipOwners = users.map(u => `${u.name || ''}`.trim()).filter(Boolean);

    const recentLeads = leads.map(l => ({
      value: `LD-${l._id.toString().slice(-4).toUpperCase()}`,
      label: `LD-${l._id.toString().slice(-4).toUpperCase()}`,
    }));

    const leadPicker = leads.map(l => ({
      value: `LD-${l._id.toString().slice(-4).toUpperCase()}`,
      label: `${l.firstName || ''} ${l.lastName || ''} · ${l.companyName || 'Clinic'}`.trim(),
    }));

    const masterLookups = {
      interests: ["Panchkarma Clinic Setup", "Clinic Setup", "Spa Setup", "Equipment", "Turnkey Project", "Consultancy"],
      leadSources: [
        "Referral",
        "Website",
        "Social Media",
        "LinkedIn",
        "Meta Ads",
        "Google Ads",
        "WhatsApp",
        "Excel Import",
        "Existing Database",
      ],
      contactTypes: ["Ayurveda Clinic", "Hospital", "Resort", "Spa", "Wellness Centre", "Retreat", "Individual"],
      clientTypes: ["Ayurveda Clinic", "Clinic", "Resort", "Spa", "Wellness Centre", "Retreat", "Hospital"],
      cities: ["Jaipur", "Goa", "Pune", "Kochi", "Delhi", "Ahmedabad", "Mumbai", "Bengaluru"],
      countries: ["India", "Nepal", "Sri Lanka", "UAE"],
      salesTeams: ["Turnkey Sales", "Equipment Sales", "Consultancy"],
      businessTypes: ["Equipment Sales", "Turnkey", "Consultancy"],
      clientBusinessTypes: ["Equipment", "Turnkey", "Consultancy"],
      leadStages: ["New", "Contacted", "Qualified", "Quotation Sent", "Negotiation"],
      opportunityStages: ["Requirement Assessment", "Proposal Preparation", "Quotation Sent", "Negotiation"],
      followUpTypes: ["Call", "WhatsApp", "Email", "Meeting", "Site Visit"],
      nextActions: ["Call", "WhatsApp", "Email", "Meeting", "Prepare BOQ", "Send Quotation"],
      paymentTerms: ["50% advance, balance before dispatch", "100% advance", "30% advance, 70% on delivery", "Net 30 days"],
      clientStatuses: ["Active", "Inactive", "On hold"],
      timezones: ["IST"],
      salesOwners: salesOwners.length > 0 ? salesOwners : [
        { value: "simran", label: "Simran Kaur · Sales Manager" },
        { value: "amit-mehta", label: "Amit Mehta · Sales Executive" },
        { value: "ritu", label: "Ritu Sharma · Marketing Manager" },
      ],
      relationshipOwners: relationshipOwners.length > 0 ? relationshipOwners : ["Simran Kaur", "Amit Mehta", "Ritu Sharma"],
      recentLeads: recentLeads.length > 0 ? recentLeads : [
        { value: "LD-1042", label: "LD-1042" },
        { value: "LD-1041", label: "LD-1041" },
      ],
      leadPicker: leadPicker.length > 0 ? leadPicker : [
        { value: "LD-1042", label: "Dr. Neha Verma · Aarogya Ayurveda" },
        { value: "LD-1043", label: "Rahul Mehta · Serene Resort" },
        { value: "LD-1044", label: "Dr. Anil Rao · Veda Clinic" },
      ],
      reminders: ["30 minutes before", "1 hour before", "1 day before", "No reminder"],
      directions: ["Outbound", "Inbound"],
      activityOutcomes: [
        "Connected – discussed requirements",
        "Connected – requested quotation",
        "No answer",
        "Call back later",
        "Not interested",
      ],
    };

    return successResponse(res, masterLookups, 'Master lookups retrieved');
  } catch (err: any) {
    return successResponse(res, {}, 'Master lookups');
  }
});

// ─── EXPORT CSV ENDPOINT ──────────────────────────────────────────────────────
crmRouter.get('/export/:entity', async (req, res) => {
  try {
    const entity = req.params.entity;
    let csvData = '';

    if (entity === 'leads') {
      const { LeadModel } = await import('../../models/lead.model');
      const leads = await LeadModel.find({ isDeleted: { $ne: true } }).lean();
      const headers = ['ID', 'Name', 'Phone', 'Email', 'Company', 'City', 'Status', 'Product'];
      const rows = leads.map(l => [
        l._id,
        `"${(l.firstName || '') + ' ' + (l.lastName || '')}"`,
        `"${l.phone || ''}"`,
        `"${l.email || ''}"`,
        `"${l.companyName || ''}"`,
        `"${l.city || ''}"`,
        `"${l.leadStatus || 'New'}"`,
        `"${l.interestedProduct || ''}"`
      ]);
      csvData = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (entity === 'clients') {
      const { ClientModel } = await import('../../models/client.model').catch(() => ({ ClientModel: null as any }));
      let clients = ClientModel ? await ClientModel.find({ isDeleted: { $ne: true } }).lean() : [];
      if (!clients.length) {
        clients = [
          { name: 'Aarogya Ayurveda', contact: 'Dr. Neha Verma', phone: '+91 98765 43210', city: 'Jaipur', type: 'Ayurveda Clinic', status: 'Active' },
          { name: 'Serene Resort', contact: 'Rahul Mehta', phone: '+91 98765 43211', city: 'Goa', type: 'Resort', status: 'Active' },
          { name: 'Healing Centre', contact: 'Dr. Priya Das', phone: '+91 98765 43212', city: 'Pune', type: 'Wellness Centre', status: 'Active' },
          { name: 'Wellness Spa', contact: 'Kavita Nair', phone: '+91 98765 43213', city: 'Kochi', type: 'Spa', status: 'Active' },
        ];
      }
      const headers = ['Name', 'Contact', 'Phone', 'City', 'Type', 'Status'];
      const rows = clients.map((c: any) => [
        `"${c.name || ''}"`,
        `"${c.contact || c.contactPerson || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.city || ''}"`,
        `"${c.type || c.clientType || ''}"`,
        `"${c.status || 'Active'}"`
      ]);
      csvData = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    } else if (entity === 'users') {
      const { UserModel } = await import('../../models/user.model');
      const users = await UserModel.find({ isDeleted: { $ne: true } }).lean();
      const headers = ['ID', 'Name', 'Email', 'Role', 'Status'];
      const rows = users.map(u => [
        u._id,
        `"${u.name || ''}"`,
        `"${u.email || ''}"`,
        `"${u.role || ''}"`,
        `"Active"`
      ]);
      csvData = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (entity === 'purchase') {
      const headers = ['RequestID', 'Item', 'RequestedBy', 'RequiredDate', 'Status', 'EstimatedValue'];
      const rows = [
        ['MR-2026-0045', 'Brass Valves & Fittings', 'Amit Kumar', '2026-11-25', 'Pending Approval', '₹45,000'],
        ['MR-2026-0046', 'Teak Wood Planks', 'Rajesh Kumar', '2026-11-28', 'Approved', '₹1,20,000'],
        ['MR-2026-0047', 'Digital Temperature Controllers', 'Sandeep Kumar', '2026-12-02', 'Ordered', '₹35,000'],
      ];
      csvData = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (entity === 'quotations') {
      const headers = ['QuotationNo', 'Client', 'BusinessType', 'Value', 'Revision', 'Owner', 'Status'];
      const rows = [
        ['QT-0124', 'Aarogya Ayurveda', 'Equipment', '₹2.4L', 'Rev 1', 'Simran Kaur', 'Accepted'],
        ['QT-0125', 'Serene Resort', 'Turnkey', '₹3.4L', 'Rev 2', 'Amit Mehta', 'Sent'],
        ['QT-0126', 'Healing Centre', 'Consultancy', '₹1.6L', 'Rev 1', 'Ritu Sharma', 'Awaiting approval'],
        ['QT-0127', 'Wellness Spa', 'Equipment', '₹1.8L', 'Rev 1', 'Amit Mehta', 'Draft'],
        ['QT-0128', 'Ayurveda Care', 'Equipment', '₹2.1L', 'Rev 2', 'Simran Kaur', 'Negotiation'],
      ];
      csvData = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else if (entity === 'pipeline' || entity === 'opportunities') {
      const headers = ['ID', 'Title', 'Client', 'Stage', 'Value', 'CloseDate', 'Owner'];
      const rows = [
        ['OP-0043', 'Aarogya Clinic Turnkey', 'Aarogya Ayurveda', 'Requirement Assessment', '₹18,00,000', '2026-12-25', 'Simran Kaur'],
        ['OP-0044', 'Serene Resort Spa Equipment', 'Serene Resort', 'Proposal Preparation', '₹8,50,000', '2026-12-15', 'Amit Mehta'],
        ['OP-0045', 'Veda Wellness Centre Expansion', 'Veda Clinic', 'Quotation Sent', '₹12,00,000', '2026-12-30', 'Ritu Sharma'],
      ];
      csvData = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } else {
      csvData = 'ID,Record,Status,ExportDate\n1,Record-1,Active,' + new Date().toISOString() + '\n';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${entity}-export-${Date.now()}.csv"`);
    return res.status(200).send('\uFEFF' + csvData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Top-level aliases
crmRouter.get('/leads', getLeadsOverview);
crmRouter.get('/clients', getClientsOverview);
crmRouter.get('/opportunities', getPipeline);
crmRouter.get('/dashboard', getCompanyDashboard);

export default crmRouter;
