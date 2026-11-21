import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';

export const crmTasksRouter = Router();

export const fullMyWorkOverview = {
  kpis: { today: 120, completed: 96, overdue: 12, blocked: 4, awaitingReview: 3 },
  totalCompanyTasks: 120,
  companyTasks: [
    {
      id: 'TSK-0086',
      title: 'Confirm production material plan',
      record: { kind: 'job', label: 'Job', ref: 'JB-0086' },
      owner: { name: 'Amit Kumar', role: 'Production Executive' },
      department: 'Production',
      due: { day: '15 Oct', time: '11:00 AM', overdue: true },
      priority: 'High',
      status: 'In Progress',
      action: 'Open',
    },
    {
      id: 'TSK-0087',
      title: 'Review resort proposal',
      record: { kind: 'opportunity', label: 'Opportunity', ref: 'EN-1042' },
      owner: { name: 'Simran Kaur', role: 'Sales Manager' },
      department: 'Sales',
      due: { day: 'Today', time: '12:30 PM', overdue: true },
      priority: 'High',
      status: 'Awaiting Review',
      action: 'Review',
    },
    {
      id: 'TSK-0088',
      title: 'Approve supplier confirmation',
      record: { kind: 'purchase', label: 'PO', ref: 'PR-0024' },
      owner: { name: 'Mohit Gupta', role: 'Purchase Manager' },
      department: 'Purchase',
      due: { day: 'Today', time: '2:00 PM', overdue: true },
      priority: 'High',
      status: 'In Progress',
      action: 'Open',
    },
    {
      id: 'TSK-0089',
      title: 'Review installation schedule',
      record: { kind: 'project', label: 'Project', ref: 'PJ-0018' },
      owner: { name: 'Sandeep Kumar', role: 'Project Manager' },
      department: 'Projects',
      due: { day: 'Today', time: '3:00 PM', overdue: true },
      priority: 'Normal',
      status: 'To Do',
      action: 'Open',
    },
    {
      id: 'TSK-0090',
      title: 'Follow up collections',
      record: { kind: 'invoice', label: 'Invoice', ref: 'INV-0142' },
      owner: { name: 'Preet Kaur', role: 'Accounts Manager' },
      department: 'Accounts',
      due: { day: 'Today', time: '4:00 PM', overdue: true },
      priority: 'High',
      status: 'In Progress',
      action: 'Open',
    },
  ],
  myPriorities: [
    {
      id: 'TSK-0101',
      title: 'Review daily report',
      record: { kind: 'report', label: 'Company reporting' },
      department: 'Management',
      due: { day: 'Today', time: '11:00 AM', overdue: true },
      priority: 'High',
      status: 'Awaiting Review',
      action: 'Review',
    },
    {
      id: 'TSK-0102',
      title: 'Approve vendor payment',
      record: { kind: 'bill', label: 'BILL', ref: 'BL-0093' },
      department: 'Accounts',
      due: { day: 'Today', time: '2:00 PM', overdue: true },
      priority: 'High',
      status: 'In Progress',
      action: 'Open',
    },
    {
      id: 'TSK-0103',
      title: 'Review project status',
      record: { kind: 'project', label: 'Project', ref: 'PJ-0018' },
      department: 'Projects',
      due: { day: 'Today', time: '5:00 PM', overdue: true },
      priority: 'Normal',
      status: 'To Do',
      action: 'Open',
    },
  ],
  schedule: [
    {
      id: 's1',
      time: '11:00 AM – 12:00 PM',
      title: 'Production review',
      department: 'Production',
      ref: 'JB-0086',
      tag: { label: 'In Progress', kind: 'progress' },
      dot: 'accent',
    },
    {
      id: 's2',
      time: '12:30 PM – 1:30 PM',
      title: 'Client proposal discussion',
      department: 'Sales',
      ref: 'EN-1042',
      tag: { label: 'Call', kind: 'call' },
      dot: 'success',
    },
    {
      id: 's3',
      time: '3:00 PM – 4:00 PM',
      title: 'Installation planning',
      department: 'Projects',
      ref: 'PJ-0018',
      tag: { label: 'Meeting', kind: 'meeting' },
      dot: 'info',
    },
  ],
  dailyReporting: { submitted: 9, total: 11, pending: ['Production', 'Purchase'] },
  attendance: { status: 'Present', date: 'Today', checkIn: '09:12 AM' },
};

const mockTask = {
  id: 'TSK-0086',
  title: 'Confirm production material plan',
  status: { label: 'In Progress', tone: 'info', icon: 'sync' },
  priority: 'High',
  assignedTo: { name: 'Amit Kumar', role: 'Production Executive' },
  assignedBy: { name: 'Vijay Sharma', role: 'Super Admin' },
  reviewer: { name: 'Rajesh Kumar', role: 'Production Manager' },
  department: 'Production',
  due: '15 Oct 2026 - 11:00 AM IST',
  linkedRecord: 'SO-0086 · Steam Chamber',
  instructions: 'Check required materials against the order BOM. Confirm available stock and report shortages.',
  checklist: [
    { id: 'c1', label: 'Verify BOM requirements', done: true },
    { id: 'c2', label: 'Check available inventory', done: true },
    { id: 'c3', label: 'Upload material readiness checklist', done: false },
  ],
  attachments: [
    { name: 'Material-list.pdf', size: '240 KB' },
  ],
  latestUpdate: {
    by: 'Amit Kumar',
    at: 'Today, 4:10 PM',
    text: 'Stock checked. One brass fitting is pending supplier confirmation.',
    tag: 'Dependency pending',
  },
};

const mockDailyReport = {
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

export const getWorkOverviewHandler = (_req: any, res: any) => {
  successResponse(res, fullMyWorkOverview, 'Work overview retrieved');
};

crmTasksRouter.get('/overview', getWorkOverviewHandler);
crmTasksRouter.get('/work', getWorkOverviewHandler);

crmTasksRouter.get('/daily-reports/today', (_req, res) => {
  successResponse(res, mockDailyReport, 'Today daily report');
});

crmTasksRouter.post('/daily-reports', (_req, res) => {
  successResponse(res, { ok: true, message: 'Daily report submitted' }, 'Daily report submitted', 201);
});

crmTasksRouter.get('/:id', (req, res) => {
  successResponse(res, { ...mockTask, id: req.params.id }, 'Task retrieved');
});

crmTasksRouter.post('/:id/updates', (req, res) => {
  successResponse(res, { id: req.params.id, update: req.body }, 'Update recorded');
});

crmTasksRouter.post('/:id/review', (req, res) => {
  successResponse(res, { id: req.params.id, status: 'Completed' }, 'Task reviewed');
});

crmTasksRouter.post('/:id/comments', (req, res) => {
  successResponse(res, { id: req.params.id, comment: req.body }, 'Comment added', 201);
});

crmTasksRouter.put('/:id', (req, res) => {
  successResponse(res, { id: req.params.id, ...req.body }, 'Task updated');
});

crmTasksRouter.post('/:id/reschedule', (req, res) => {
  successResponse(res, { id: req.params.id, ...req.body }, 'Task rescheduled');
});

crmTasksRouter.post('/', (_req, res) => {
  successResponse(res, { id: `TSK-${Math.floor(Math.random() * 800 + 100)}` }, 'Task created', 201);
});

export default crmTasksRouter;
