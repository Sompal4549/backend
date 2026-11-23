import { Router } from 'express';
import path from 'path';
import { successResponse } from '../../../utils/api-response';
import { CrmRecord } from '../../../models/crm-record.model';

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
      subtitle: 'Steam generator · Jaipur',
      start: '2026-10-01',
      end: '2026-10-25',
      progress: 40,
      status: { label: 'On track', tone: 'success', icon: 'check' },
      milestones: [
        { date: '2026-10-05', label: 'Advance payment', done: true },
        { date: '2026-10-18', label: 'Testing', done: false },
      ],
    },
  ],
};

const reportsCatalog = {
  categories: [
    { key: 'sales', label: 'Sales & Conversion' },
    { key: 'operations', label: 'Production & Delivery' },
    { key: 'finance', label: 'Invoicing & Collections' },
  ],
  savedViews: [
    { key: 'monthly-revenue', name: 'Monthly Revenue by Category', category: 'finance', updated: '14 Oct 2026' },
    { key: 'lead-conversions', name: 'Lead Conversion by Source', category: 'sales', updated: '13 Oct 2026' },
    { key: 'dispatch-delays', name: 'Dispatch Delay Analysis', category: 'operations', updated: '12 Oct 2026' },
  ],
};

crmRecordsRouter.get('/calendar/work', async (_req, res) => {
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const calDoc = await CrmRecord.findOne({ key: 'calendar.work' });
    const stored = calDoc?.data && Array.isArray(calDoc.data) ? calDoc.data : [];
    const all = [...stored, ...workCalendar.filter((ev) => !stored.some((s: any) => s.id === ev.id))];
    return successResponse(res, all, 'Work calendar retrieved');
  } catch {
    return successResponse(res, workCalendar, 'Work calendar retrieved');
  }
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

crmRecordsRouter.get('/', async (req, res) => {
  const setsQuery = req.query.sets as string | undefined;
  if (setsQuery) {
    const keys = setsQuery.split(',').map((k) => k.trim()).filter(Boolean);
    const result: Record<string, any> = {};

    try {
      const docs = await CrmRecord.find({ key: { $in: keys } });
      const docMap = new Map(docs.map((d: any) => [d.key, d.data]));

      for (const key of keys) {
        if (docMap.has(key)) {
          result[key] = docMap.get(key);
        } else {
          const initial = recordSetsMock[key] || {
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
          result[key] = initial;
          // Seed in background into MongoDB
          CrmRecord.create({ key, data: initial }).catch(() => {});
        }
      }
      return successResponse(res, result, 'Record sets retrieved from database');
    } catch {
      for (const key of keys) {
        result[key] = recordSetsMock[key] || { id: key, rows: [], total: 0 };
      }
      return successResponse(res, result, 'Record sets retrieved');
    }
  }

  try {
    const allDocs = await CrmRecord.find({});
    if (allDocs.length > 0) {
      const allResult: Record<string, any> = {};
      allDocs.forEach((d: any) => { allResult[d.key] = d.data; });
      return successResponse(res, allResult, 'All record sets retrieved from database');
    }
  } catch {}

  return successResponse(res, recordSetsMock, 'All record sets retrieved');
});

crmRecordsRouter.get('/:key', async (req, res) => {
  const key = req.params.key;
  try {
    const existing = await CrmRecord.findOne({ key });
    if (existing && existing.data) {
      return successResponse(res, existing.data, `Record set ${key} retrieved from database`);
    }

    const initial = recordSetsMock[key] || {
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

    // Save into MongoDB so it is permanently in database
    await CrmRecord.findOneAndUpdate(
      { key },
      { key, data: initial },
      { upsert: true, new: true }
    );

    return successResponse(res, initial, `Record set ${key} initialized in database`);
  } catch (err: any) {
    const fallback = recordSetsMock[key] || { id: key, rows: [], total: 0 };
    return successResponse(res, fallback, `Record set ${key} retrieved`);
  }
});

crmRecordsRouter.post('/:key', async (req, res) => {
  const key = req.params.key;
  const newRow = req.body;
  try {
    const record = await CrmRecord.findOne({ key });
    const data = record?.data || recordSetsMock[key] || { id: key, rows: [], total: 0 };
    if (!newRow.id) newRow.id = `row-${Date.now()}`;
    data.rows = [newRow, ...(data.rows || [])];
    data.total = (data.total || 0) + 1;
    await CrmRecord.findOneAndUpdate({ key }, { key, data }, { upsert: true });
    return successResponse(res, data, `Record added to ${key} in database`, 201);
  } catch (err: any) {
    return successResponse(res, newRow, `Record accepted`, 201);
  }
});

export default crmRecordsRouter;
