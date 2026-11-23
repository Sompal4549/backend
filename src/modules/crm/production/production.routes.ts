import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';
import { inPeriod, optionMatch, readQuery, textMatch } from '../crm-filters';

export const crmProductionRouter = Router();

const items = [
  { id: 'p1', name: 'Steam Chamber', spec: 'Standard model', qty: 2, unit: 'Nos.' },
  { id: 'p2', name: 'Therapy Table', spec: 'Standard model', qty: 1, unit: 'Nos.' },
  { id: 'p3', name: 'Shirodhara Stand', spec: 'Adjustable stand', qty: 2, unit: 'Nos.' },
];

const mockJob = {
  id: 'JB-2026-0090',
  salesOrder: 'SO0090',
  client: 'Aarogya Ayurveda',
  source: 'QT0130Rev2',
  quotationRef: 'QT-2026-0130 Rev2',
  orderDate: '2026-11-17',
  orderValue: 224200,
  priority: 'High',
  workshop: 'Ghaziabad',
  manager: 'Rajesh Kumar',
  assignee: 'Amit Kumar',
  assignedBy: 'Vijay Sharma',
  plannedStart: '2026-11-17',
  qcPlanned: '2026-11-22',
  dispatchPlanned: '2026-11-23',
  operations: ['Cutting', 'Assembly', 'Finishing', 'Test', 'QC'],
  items,
  plan: [
    { id: 'o1', operation: 'Cutting', owner: 'Rakesh', date: '2026-11-17', hours: 8 },
    { id: 'o2', operation: 'Assembly', owner: 'Amit', date: '2026-11-18', hours: 16 },
    { id: 'o3', operation: 'Finishing', owner: 'Sandeep', date: '2026-11-19', hours: 12 },
    { id: 'o4', operation: 'Test', owner: 'Nitin', date: '2026-11-20', hours: 6 },
    { id: 'o5', operation: 'QC', owner: 'Neha', date: '2026-11-22', hours: 4 },
  ],
  materials: [
    { id: 'mt1', item: 'Steam Controller', required: 5, available: 4, reserved: 4, source: 'Purchase', remarks: 'Replenishment proposed' },
  ],
  note: 'Production job for SO0090 based on QT0130Rev2.',
  attachments: [{ name: 'SteamChamber_Drawing_v2.pdf', size: '1.9 MB' }],
};

const productionOverview = {
  kpis: [
    { key: 'active', label: 'Active jobs', value: 18, change: '+3', direction: 'up', tone: 'success' },
    { key: 'blocked', label: 'Material blocked', value: 2, change: '−1', direction: 'down', tone: 'success' },
    { key: 'qc', label: 'Awaiting QC', value: 3, change: '+2', direction: 'up', tone: 'danger' },
    { key: 'dispatch', label: 'Dispatches due', value: 3, change: '+1', direction: 'up', tone: 'danger' },
  ],
  totalJobs: 18,
  jobs: [
    {
      id: 'JB-0086',
      salesOrder: 'SO-0086',
      client: 'Aarogya Ayurveda',
      product: 'Steam Chamber',
      owner: 'Rajesh Kumar',
      stage: { label: 'Assembly', tone: 'info' },
      progress: 67,
      targetDispatch: '19 Oct 2026',
      status: { label: 'In progress', tone: 'success', icon: 'check' },
    },
    {
      id: 'JB-0087',
      salesOrder: 'SO-0087',
      client: 'Veda Clinic',
      product: 'Therapy Tables',
      owner: 'Rajesh Kumar',
      stage: { label: 'Finishing', tone: 'violet' },
      progress: 82,
      targetDispatch: '16 Oct 2026',
      status: { label: 'QC pending', tone: 'warning', icon: 'warning' },
    },
    {
      id: 'JB-0088',
      salesOrder: 'SO-0088',
      client: 'Wellness Spa',
      product: 'Shirodhara Stand',
      owner: 'Amit Kumar',
      stage: { label: 'Material planning', tone: 'accent' },
      progress: 15,
      targetDispatch: '18 Oct 2026',
      status: { label: 'Blocked', tone: 'danger', icon: 'alert' },
    },
    {
      id: 'JB-0089',
      salesOrder: 'SO-0089',
      client: 'Retreat Spaces',
      product: 'Massage Table',
      owner: 'Amit Kumar',
      stage: { label: 'Packing', tone: 'success' },
      progress: 95,
      targetDispatch: '15 Oct 2026',
      status: { label: 'Ready to dispatch', tone: 'success', icon: 'check' },
    },
  ],
  jobDetails: {
    id: 'JB-0087',
    status: 'In Production',
    salesOrder: 'SO-0087',
    client: 'Veda Clinic',
    product: 'Therapy Tables',
    targetDispatch: '16 Oct 2026',
    priority: 'High',
    owner: 'Rajesh Kumar',
    notes: 'Finishing in progress. QC to be completed before dispatch.',
    steps: [
      { label: 'Materials', state: 'done', note: 'Completed', date: '12 Oct 2026' },
      { label: 'Production', state: 'done', note: 'Completed', date: '14 Oct 2026' },
      { label: 'QC', state: 'active', note: 'In progress' },
      { label: 'Packing', state: 'pending', note: 'Pending' },
      { label: 'Dispatch', state: 'pending', note: 'Pending' },
    ],
    alert: 'QC approval is required before dispatch.',
  },
  readiness: [
    { key: 'materials', count: 2, title: 'material shortages', subtitle: 'Items required for 2 jobs' },
    { key: 'qc', count: 3, title: 'QC reviews', subtitle: 'Awaiting approval' },
    { key: 'dispatch', count: 1, title: 'dispatch approval', subtitle: 'Ready for final approval' },
  ],
  dispatchPlan: [
    {
      id: 'DSP-0034',
      client: 'Healing Centre',
      status: 'Packed',
      statusNote: 'Vehicle pending',
      owner: 'Udit Sharma',
      targetTime: '05:00 PM',
    },
  ],
};

crmProductionRouter.get('/overview', (req, res) => {
  const q = readQuery(req, 'q', 'owner', 'stage', 'due', 'period');
  // The Due Date control narrows the jobs table; the header period is the fallback.
  const range = q.due && !/^all\b/i.test(q.due) ? q.due : q.period;
  const jobs = productionOverview.jobs.filter(
    (job) =>
      textMatch(q, job.id, job.salesOrder, job.client, job.product) &&
      optionMatch(job.owner, q.owner) &&
      optionMatch(job.stage.label, q.stage) &&
      inPeriod(job.targetDispatch, range),
  );

  successResponse(res, { ...productionOverview, jobs }, 'Production overview retrieved');
});

crmProductionRouter.get('/jobs/new', (_req, res) => {
  successResponse(res, mockJob, 'New job draft retrieved');
});

crmProductionRouter.get('/jobs/:id', (req, res) => {
  successResponse(res, { ...mockJob, id: req.params.id }, 'Job retrieved');
});

crmProductionRouter.get('/jobs/:id/plan', (req, res) => {
  const fullJobPlan = {
    id: req.params.id || 'JB0090',
    salesOrder: 'SO0090',
    client: 'Aarogya Ayurveda',
    manager: 'Rajesh Kumar',
    assignee: 'Amit Kumar',
    assignedBy: 'Vijay Sharma',
    start: '2026-11-17',
    targetEnd: '2026-11-23',
    status: 'Planned',
    progress: 45,
    products: [
      { name: 'Steam Chamber', qty: 2 },
      { name: 'Therapy Tables', qty: 1 },
      { name: 'Shirodhara Stand', qty: 2 },
    ],
    timeline: [
      { stage: 'Materials', detail: 'Plan & arrange', window: '17 Nov – 18 Nov', state: 'current' },
      { stage: 'Production', detail: 'Manufacture & build', window: '19 Nov – 21 Nov', state: 'pending' },
      { stage: 'QC', detail: 'Check & verify', window: '22 Nov 2026', state: 'pending' },
      { stage: 'Dispatch', detail: 'Pack & handover', window: '23 Nov 2026', state: 'pending' },
    ],
    materials: [
      { id: 'm1', item: 'SteamController', required: 5, available: 4, reserved: 4, source: 'Purchase', remarks: '' },
      { id: 'm2', item: 'TeakPanel', required: 8, available: 40, reserved: 8, source: 'Stock', remarks: '' },
      { id: 'm3', item: 'BrassFitting', required: 10, available: 10, reserved: 10, source: 'Stock', remarks: '' },
    ],
  };
  successResponse(res, fullJobPlan, 'Job plan retrieved');
});

crmProductionRouter.get('/jobs/:id/qc', (req, res) => {
  const fullQc = {
    jobId: req.params.id || 'JB0090',
    salesOrder: 'SO0090',
    client: 'Aarogya Ayurveda',
    products: 'Steam Chamber, Therapy Table, Shirodhara Stand',
    stage: 'Finished',
    reviewDate: '2026-11-22',
    inspector: 'Rajesh Kumar',
    status: 'In Progress',
    items: [
      { name: 'Steam Chamber', qty: 2 },
      { name: 'Therapy Table', qty: 1 },
      { name: 'Shirodhara Stand', qty: 2 },
    ],
    summary: { expected: 5, accepted: 4, rework: 0, rejected: 0 },
    checks: [
      { id: 'q1', check: 'Dimensions', result: 'Pass', remarks: 'As per drawing; within tolerance.', evidence: 'DIM-01.jpg' },
      { id: 'q2', check: 'Surface Finish', result: 'Pass', remarks: 'Smooth and uniform finish.', evidence: 'FIN-01.jpg' },
      { id: 'q3', check: 'Wiring & Insulation', result: 'Pass', remarks: 'Wiring and insulation check OK.', evidence: 'ELE-01.jpg' },
      { id: 'q4', check: 'Temperature Control', result: 'Pending', remarks: 'Test pending – to be completed.', evidence: '' },
      { id: 'q5', check: 'Load Stability', result: 'Pass', remarks: 'Stable under rated load.', evidence: 'LOAD-01.jpg' },
      { id: 'q6', check: 'Accessories', result: 'Pass', remarks: 'All standard accessories available.', evidence: 'ACC-01.jpg' },
      { id: 'q7', check: 'Packaging', result: 'Pass', remarks: 'Packed with edge and surface protection.', evidence: 'PACK-01.jpg' },
    ],
    remarks: 'QC completed for 4 units out of 5. Six checks passed. Temperature Control test is pending and will be completed before final approval.',
    evidence: [{ name: 'QC_JB0090_Evidence.zip', size: '6.2 MB' }],
  };
  successResponse(res, fullQc, 'QC review retrieved');
});

crmProductionRouter.get('/dispatches/new', (_req, res) => {
  const fullDispatch = {
    id: 'DS-2026-0047',
    salesOrder: 'SO-0090',
    jobId: 'JB-0090',
    client: 'Aarogya Ayurveda',
    qcStatus: 'QC Passed',
    unitsReleased: 5,
    dispatchDate: '2026-11-23',
    deliveryExpected: '2026-11-25',
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
    note: 'Handle with care.',
    attachments: [{ name: 'Packing_List_DS-2026-0047.pdf', size: '245 KB' }],
  };
  successResponse(res, fullDispatch, 'New dispatch draft');
});

export default crmProductionRouter;
