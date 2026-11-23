import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';
import { optionMatch, readQuery, textMatch } from '../crm-filters';

export const crmServiceRouter = Router();

const highPriority = { label: 'High', tone: 'danger', icon: 'alert' };
const normalPriority = { label: 'Normal', tone: 'success', icon: 'dot' };
const scheduled = { label: 'Scheduled', tone: 'info' };

const serviceOverview = {
  kpis: { open: 4, dueToday: 2, escalated: 1, closedThisMonth: 18, closedChange: '+20%' },
  tickets: [
    {
      id: 'SR-0042',
      client: 'Aarogya Ayurveda',
      equipment: 'Steam chamber',
      issue: 'Temperature fluctuation',
      assignedTo: 'Udit Sharma',
      priority: highPriority,
      responseDue: { label: 'Today 3:00 PM', overdue: true },
      status: { label: 'In progress', tone: 'info', icon: 'dot' },
      action: 'View',
    },
    {
      id: 'SR-0043',
      client: 'Wellness Spa',
      equipment: 'Shirodhara unit',
      issue: 'Flow adjustment',
      assignedTo: 'Karan Singh',
      priority: normalPriority,
      responseDue: { label: 'Today 5:00 PM', overdue: false },
      status: { label: 'Scheduled', tone: 'violet', icon: 'dot' },
      action: 'View',
    },
    {
      id: 'SR-0044',
      client: 'Veda Clinic',
      equipment: 'Therapy table',
      issue: 'Surface repair',
      assignedTo: 'Udit Sharma',
      priority: highPriority,
      responseDue: { label: 'Overdue 2 hours', overdue: true },
      status: { label: 'Escalated', tone: 'danger', icon: 'warning' },
      action: 'Review',
    },
    {
      id: 'SR-0045',
      client: 'Healing Centre',
      equipment: 'Steam generator',
      issue: 'Preventive service',
      assignedTo: 'Karan Singh',
      priority: normalPriority,
      responseDue: { label: '16 Oct 2026', overdue: false },
      status: { label: 'Open', tone: 'neutral', icon: 'dot' },
      action: 'View',
    },
  ],
  visits: [
    {
      time: '3:00 PM',
      client: 'Aarogya Ayurveda',
      location: 'Jaipur, RJ',
      type: 'Remote support',
      assignedTo: 'Udit Sharma',
      status: scheduled,
    },
    {
      time: '5:00 PM',
      client: 'Wellness Spa',
      location: 'Kochi, KL',
      type: 'Engineer visit',
      assignedTo: 'Karan Singh',
      status: scheduled,
    },
  ],
  escalations: [
    {
      ticket: 'SR-0044',
      client: 'Veda Clinic',
      issue: 'Surface repair',
      assignedTo: 'Udit Sharma',
      customerUpdate: 'Required by 2:00 PM',
      note: 'Customer update required for SR-0044. Do not mark as resolved without closure note and customer confirmation.',
    },
  ],
  maintenance: [
    {
      equipmentId: 'EQ-0086',
      client: 'Aarogya Ayurveda',
      equipment: 'Steam chamber',
      warrantyTill: 'Oct 2027',
      nextService: 'Jan 2027',
      serviceType: 'Preventive maintenance',
      status: { label: 'Scheduled', tone: 'success' },
    },
  ],
};

const mockServiceTicket = {
  id: 'SR-0046',
  status: 'In Progress',
  client: 'Aarogya Ayurveda',
  equipmentId: 'EQ-0086',
  equipment: 'Steam Chamber',
  salesOrder: 'SO-0086',
  issue: 'Temperature fluctuation',
  priority: 'High',
  resolution: 'Not resolved',
  warranty: { status: 'Under Warranty', until: 'Oct 2027' },
  raisedOn: '17 Nov 2026',
  raisedBy: 'Aarogya Ayurveda',
  owner: 'Udit Sharma',
  contact: 'Dr. Neha Verma',
  address: 'Jaipur, Rajasthan',
  opportunity: '–',
  description: 'Client reported that the Steam Chamber (EQ-0086) is showing temperature fluctuation during operation.',
  timeline: [
    { title: 'Ticket created', text: 'Service ticket SR-0046 raised.', at: '17 Nov 2026, 10:05 AM', done: true },
    { title: 'Assigned to engineer', text: 'Ticket assigned to Udit Sharma.', at: '17 Nov 2026, 10:12 AM', done: true },
    { title: 'Status updated', text: 'Status changed to In Progress.', at: '17 Nov 2026, 10:15 AM', done: true },
  ],
  schedule: {
    engineer: 'Udit Sharma',
    mode: 'Remote',
    date: '2026-11-17',
    slot: '15:00 – 16:00',
    contact: 'Dr. Neha Verma',
    address: 'Jaipur, Rajasthan',
    reason: 'Diagnosis',
    remind: true,
    remindBefore: '30 min',
  },
  parts: [],
};

crmServiceRouter.get('/overview', (req, res) => {
  const q = readQuery(req, 'q', 'client', 'engineer', 'priority', 'status');
  const tickets = serviceOverview.tickets.filter(
    (ticket) =>
      textMatch(q, ticket.id, ticket.client, ticket.equipment, ticket.issue, ticket.assignedTo) &&
      optionMatch(ticket.client, q.client) &&
      optionMatch(ticket.assignedTo, q.engineer) &&
      optionMatch(ticket.priority.label, q.priority) &&
      optionMatch(ticket.status.label, q.status),
  );
  const visits = serviceOverview.visits.filter(
    (visit) =>
      textMatch(q, visit.client, visit.location, visit.type, visit.assignedTo) &&
      optionMatch(visit.client, q.client) &&
      optionMatch(visit.assignedTo, q.engineer),
  );
  const escalations = serviceOverview.escalations.filter(
    (escalation) =>
      textMatch(q, escalation.ticket, escalation.client, escalation.issue, escalation.assignedTo) &&
      optionMatch(escalation.client, q.client) &&
      optionMatch(escalation.assignedTo, q.engineer),
  );
  const maintenance = serviceOverview.maintenance.filter(
    (row) => textMatch(q, row.equipmentId, row.client, row.equipment) && optionMatch(row.client, q.client),
  );

  const filtered = Object.keys(q).length > 0;
  const kpis = filtered
    ? {
        ...serviceOverview.kpis,
        open: tickets.length,
        dueToday: tickets.filter((ticket) => ticket.responseDue.overdue).length,
        escalated: tickets.filter((ticket) => ticket.status.label === 'Escalated').length,
      }
    : serviceOverview.kpis;

  successResponse(
    res,
    { ...serviceOverview, kpis, tickets, visits, escalations, maintenance },
    'Service overview retrieved',
  );
});

crmServiceRouter.get('/tickets/new', (_req, res) => {
  const draft = {
    id: `SR-2026-${Math.floor(Math.random() * 800 + 100)}`,
    reportedOn: new Date().toISOString().slice(0, 10),
    owner: 'Udit Sharma',
    client: 'Aarogya Ayurveda',
    contact: 'Dr. Neha',
    phone: '+91 98765 43210',
    email: 'neha@example.com',
    equipment: 'EQ-2026-0086 / Steam Chamber',
    sourceOrder: 'SO0086',
    warrantyUntil: '2027-10-31',
    source: 'Phone',
    category: 'Temperature control',
    priority: 'High',
    serviceType: 'Remote initially',
    subject: 'Steam chamber temperature fluctuation',
    description: 'The client reported that the steam chamber temperature is fluctuating during operation.',
    attachments: [],
    dueDate: new Date().toISOString().slice(0, 10),
    dueTime: '15:00',
    targetResponse: '1 hour',
  };
  successResponse(res, draft, 'Ticket draft retrieved');
});

crmServiceRouter.get('/tickets/:id', (req, res) => {
  successResponse(res, { ...mockServiceTicket, id: req.params.id }, 'Ticket retrieved');
});

crmServiceRouter.get('/tickets/:id/closure', (req, res) => {
  const closure = {
    ticketId: req.params.id,
    closureDate: new Date().toISOString().slice(0, 10),
    engineerNotes: 'Replaced temperature sensor probe and calibrated controller.',
    customerFeedback: 'Satisfied',
    rating: 5,
    signedBy: 'Dr. Neha Verma',
  };
  successResponse(res, closure, 'Closure details retrieved');
});

export default crmServiceRouter;
