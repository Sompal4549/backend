import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';
import { CrmRecord } from '../../../models/crm-record.model';

export const crmTopbarRouter = Router();

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
      reason: 'Additional discount to close the order for Clinic Equipment.',
      status: 'pending',
      assignedToMe: true,
      approver: 'Vijay Sharma',
      details: {
        client: 'Aarogya Ayurveda',
        linkedRecord: 'OP-2026-0061',
        documentNo: 'QT-2026-0130 Rev1',
        documentDate: '16 Nov 2026',
        summary: [
          { label: 'Subtotal', value: '₹1,90,000.00' },
          { label: 'Discount', value: '₹10,000.00', editable: true, note: '(5.26%)' },
          { label: 'Taxable value', value: '₹1,80,000.00' },
          { label: 'IGST (18%)', value: '₹32,400.00', editable: true },
        ],
        total: '₹2,12,400.00',
        rule: 'Discount above 5% requires approval.',
        attachment: { name: 'Equipment_Package_Proposal.pdf', size: '1.2 MB' },
      },
    },
  ],
};

const mockFollowUps = [
  { id: 'fu-1', title: 'Dr. Neha Verma – Aarogya Ayurveda', dueTime: 'Today 2:00 PM', purpose: 'Floor plan and table delivery schedule discussion', status: 'Due Today', priority: 'High' },
  { id: 'fu-2', title: 'Rahul Mehta – Serene Resort', dueTime: 'Today 3:30 PM', purpose: 'Quotation review and revised BOQ submission', status: 'Due Today', priority: 'Medium' },
];

const mockNotifications = [
  {
    id: 'n1',
    kind: 'approval',
    title: 'Quotation discount pending approval – QT0130 Rev1',
    body: 'Simran has requested approval for a 5.26% discount on Quotation QT0130 Rev1 (total ₹2,12,400.00).',
    module: 'Quotations & Orders',
    href: '/sales/quotations',
    time: '04:27 PM',
    day: 'Today',
    unread: true,
  },
  {
    id: 'n2',
    kind: 'task',
    title: 'Task TK0148 submitted for review',
    body: 'Amit has submitted Task TK0148 – “Site measurement” for your review.',
    module: 'Projects & Execution',
    href: '/operations/projects',
    time: '02:13 PM',
    day: 'Today',
    unread: true,
  },
  {
    id: 'n3',
    kind: 'stock',
    title: 'Stock alert – SC08',
    body: 'Item SC08 (Steam Controller) is currently available 4, which is below the reorder level of 5.',
    module: 'Inventory',
    href: '/operations/inventory',
    time: '11:41 AM',
    day: 'Today',
    unread: false,
  },
  {
    id: 'n4',
    kind: 'purchase',
    title: 'Purchase order PO0069 placed',
    body: 'PO0069 for Brass fittings (₹38,500.00) has been placed with BrassTech India.',
    module: 'Purchase & Vendors',
    href: '/operations/purchase',
    time: 'Yesterday',
    day: 'Yesterday',
    unread: false,
  },
  {
    id: 'n5',
    kind: 'report',
    title: 'Daily business summary published',
    body: 'Daily operations summary for 16 Nov has been prepared by Sandeep Kumar.',
    module: 'Reports & Analytics',
    href: '/management/reports',
    time: 'Yesterday',
    day: 'Yesterday',
    unread: false,
  },
];

crmTopbarRouter.get('/approvals', async (_req, res) => {
  try {
    const doc = await CrmRecord.findOne({ key: 'topbar.approvals' });
    if (doc && doc.data) {
      return successResponse(res, doc.data, 'Approvals retrieved from database');
    }
    await CrmRecord.create({ key: 'topbar.approvals', data: mockApprovals }).catch(() => {});
  } catch {}
  successResponse(res, mockApprovals, 'Approvals retrieved');
});

crmTopbarRouter.post('/approvals/:id/decision', async (req, res) => {
  const { id } = req.params;
  const { decision, notes } = req.body;
  try {
    const doc = await CrmRecord.findOne({ key: 'topbar.approvals' });
    if (doc && doc.data && Array.isArray(doc.data.requests)) {
      doc.data.requests = doc.data.requests.map((r: any) =>
        r.id === id ? { ...r, status: decision === 'approve' ? 'approved' : 'rejected', notes } : r
      );
      doc.markModified('data');
      await doc.save();
    }
  } catch {}
  successResponse(res, { id, status: decision || 'approved', notes }, 'Decision recorded');
});

crmTopbarRouter.get('/follow-ups', (_req, res) => {
  successResponse(res, mockFollowUps, 'Follow-ups retrieved');
});

crmTopbarRouter.get('/notifications', (_req, res) => {
  successResponse(res, mockNotifications, 'Notifications retrieved');
});

crmTopbarRouter.post('/notifications/read', (_req, res) => {
  successResponse(res, { ok: true }, 'Notifications marked as read');
});

crmTopbarRouter.get('/search', (req, res) => {
  const query = String(req.query.q || '').toLowerCase();
  const results = [
    { id: 'CL-0086', title: 'Aarogya Ayurveda', type: 'Client', subtitle: 'Jaipur, Rajasthan', href: '/sales/clients/CL-0086' },
    { id: 'QT-0124', title: 'QT-0124 (Aarogya Ayurveda)', type: 'Quotation', subtitle: '₹2.4L – Accepted', href: '/sales/quotations/QT-0124' },
    { id: 'PJ-0018', title: 'Serene Resort Turnkey', type: 'Project', subtitle: 'Goa – Sandeep Kumar', href: '/operations/projects/PJ-0018' },
  ].filter((r) => !query || r.title.toLowerCase().includes(query) || r.type.toLowerCase().includes(query));

  successResponse(res, results, 'Search results');
});
