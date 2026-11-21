import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';

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
  { id: 'nt-1', title: 'New lead assigned', body: 'Lead LD-1045 from Website has been assigned to you.', time: '10 min ago', read: false },
  { id: 'nt-2', title: 'Quotation Approved', body: 'Discount approval granted for QT-2026-0130.', time: '1 hour ago', read: false },
  { id: 'nt-3', title: 'Payment Received', body: 'NEFT credit of ₹1,00,000 recorded against INV-0144.', time: '3 hours ago', read: true },
];

crmTopbarRouter.get('/approvals', (_req, res) => {
  successResponse(res, mockApprovals, 'Approvals retrieved');
});

crmTopbarRouter.post('/approvals/:id/decision', (req, res) => {
  successResponse(res, { id: req.params.id, status: req.body.decision || 'APPROVED' }, 'Decision recorded');
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
