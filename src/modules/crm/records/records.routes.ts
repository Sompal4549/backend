import { Router } from 'express';
import path from 'path';
import { successResponse } from '../../../utils/api-response';

export const crmRecordsRouter = Router();

// Dynamically load frontend record sets mock definitions (tsx resolves TypeScript files seamlessly)
let recordSetsMock: Record<string, any> = {};
try {
  const recordSetsPath = path.resolve(__dirname, '../../../../../ensis_crm/src/mocks/record-sets');
  const mod = require(recordSetsPath);
  recordSetsMock = mod.recordSetsMock || {};
} catch (err) {
  console.warn('[CRM Records] Warning: Could not load frontend record-sets mock:', (err as any)?.message);
}

const workCalendar = [
  { id: 'ev1', title: 'Production review', date: new Date().toISOString().slice(0, 10), start: '11:00', end: '12:00', kind: 'review', owner: 'Rajesh Kumar', department: 'Production', reference: 'JB-0086' },
  { id: 'ev2', title: 'Client proposal discussion', date: new Date().toISOString().slice(0, 10), start: '12:30', end: '13:30', kind: 'call', owner: 'Simran Kaur', department: 'Sales', reference: 'EN-1042' },
  { id: 'ev3', title: 'Installation planning', date: new Date().toISOString().slice(0, 10), start: '15:00', end: '16:00', kind: 'meeting', owner: 'Sandeep Kumar', department: 'Projects', reference: 'PJ-0018' },
  { id: 'ev4', title: 'Payment follow-up', date: new Date().toISOString().slice(0, 10), start: '16:30', end: '17:00', kind: 'call', owner: 'Preet Kaur', department: 'Accounts', reference: 'INV-0142' },
  { id: 'ev5', title: 'Team review', date: new Date().toISOString().slice(0, 10), start: '18:00', end: '18:30', kind: 'meeting', owner: 'Vijay Sharma', department: 'Management' },
];

const serviceCalendar = [
  { id: 'srv-1', title: 'Aarogya Steam Chamber Check', date: new Date().toISOString().slice(0, 10), start: '10:00', end: '11:30', kind: 'service', owner: 'Udit Sharma', department: 'Service', reference: 'SR-0046' },
];

const projectsTimeline = {
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

const reportsCatalog = [
  { key: 'monthly-sales-summary', title: 'Monthly Sales & Revenue Report', category: 'Sales' },
  { key: 'project-timeline-variance', title: 'Project Timeline Variance', category: 'Operations' },
  { key: 'inventory-aging', title: 'Inventory Aging Report', category: 'Supply Chain' },
];

crmRecordsRouter.get('/calendar/work', (_req, res) => {
  successResponse(res, workCalendar, 'Work calendar retrieved');
});

crmRecordsRouter.get('/calendar/service', (_req, res) => {
  successResponse(res, serviceCalendar, 'Service calendar retrieved');
});

crmRecordsRouter.get('/projects/timeline', (_req, res) => {
  successResponse(res, projectsTimeline, 'Projects timeline retrieved');
});

crmRecordsRouter.get('/reports/catalog', (_req, res) => {
  successResponse(res, reportsCatalog, 'Reports catalog retrieved');
});

crmRecordsRouter.post('/forms/:formId', (req, res) => {
  successResponse(res, { id: `F-${Date.now()}`, ...req.body }, 'Form submitted', 201);
});

crmRecordsRouter.get('/:key', (req, res) => {
  const key = req.params.key;
  const set = recordSetsMock[key];
  if (set) {
    return successResponse(res, set, `Record set ${key} retrieved`);
  }

  // Graceful fallback for any unknown or dynamic record-set key
  const fallback = {
    id: key,
    title: key.replace(/[-_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `All records for ${key}`,
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'status', label: 'Status', kind: 'status' },
      { key: 'updatedAt', label: 'Updated' },
    ],
    rows: [],
    total: 0,
  };
  return successResponse(res, fallback, `Record set ${key} retrieved`);
});

export default crmRecordsRouter;
