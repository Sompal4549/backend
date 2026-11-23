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

export const mockDailyReport = {
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

export const getWorkOverviewHandler = async (req: any, res: any) => {
  try {
    const period = (req.query?.period as string) || 'All Periods';
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    const storedTasks = tasksDoc?.data && Array.isArray(tasksDoc.data) ? tasksDoc.data : [];

    const deletedDoc = await CrmRecord.findOne({ key: 'tasks.deletedIds' });
    const deletedIds = new Set<string>(deletedDoc?.data && Array.isArray(deletedDoc.data) ? deletedDoc.data : []);

    const existingDefault = fullMyWorkOverview.companyTasks;
    const allCompanyTasks = [...storedTasks, ...existingDefault.filter((t) => !storedTasks.some((st: any) => st.id === t.id))]
      .filter((t) => !deletedIds.has(t.id));

    let filteredCompanyTasks = allCompanyTasks;
    let kpis = {
      today: allCompanyTasks.length,
      completed: allCompanyTasks.filter((t: any) => t.status === 'Completed').length,
      overdue: allCompanyTasks.filter((t: any) => (t.due?.overdue || t.due?.day?.toLowerCase().includes('oct')) && t.status !== 'Completed').length,
      blocked: allCompanyTasks.filter((t: any) => t.status === 'Blocked').length,
      awaitingReview: allCompanyTasks.filter((t: any) => t.status === 'Awaiting Review').length,
    };

    if (period === 'Today') {
      filteredCompanyTasks = allCompanyTasks.filter((t: any) =>
        t.due?.day === 'Today' || t.status === 'In Progress' || t.status === 'Awaiting Review' || t.priority === 'High'
      );
      kpis = {
        today: filteredCompanyTasks.length,
        completed: filteredCompanyTasks.filter((t: any) => t.status === 'Completed').length,
        overdue: filteredCompanyTasks.filter((t: any) => t.due?.overdue && t.status !== 'Completed').length,
        blocked: filteredCompanyTasks.filter((t: any) => t.status === 'Blocked').length,
        awaitingReview: filteredCompanyTasks.filter((t: any) => t.status === 'Awaiting Review').length,
      };
    } else if (period === 'This Week') {
      filteredCompanyTasks = allCompanyTasks.filter((t: any) => t.status !== 'Completed');
      kpis = {
        today: filteredCompanyTasks.length,
        completed: allCompanyTasks.filter((t: any) => t.status === 'Completed').length,
        overdue: allCompanyTasks.filter((t: any) => t.due?.overdue && t.status !== 'Completed').length,
        blocked: allCompanyTasks.filter((t: any) => t.status === 'Blocked').length,
        awaitingReview: allCompanyTasks.filter((t: any) => t.status === 'Awaiting Review').length,
      };
    } else if (period === 'This Quarter') {
      filteredCompanyTasks = allCompanyTasks;
    }

    const myPrioritiesDoc = await CrmRecord.findOne({ key: 'dashboard.myPriorities' });
    const myPriorities = myPrioritiesDoc?.data && Array.isArray(myPrioritiesDoc.data)
      ? myPrioritiesDoc.data.map((p: any) => ({
          id: p.id,
          title: p.task || p.title,
          record: { kind: 'task', label: p.department || 'Task' },
          department: p.department || 'General',
          due: { day: 'Today', time: p.time || '11:00 AM', overdue: false },
          priority: p.priority || 'Normal',
          status: 'To Do',
          action: 'Open',
        }))
      : fullMyWorkOverview.myPriorities;

    return successResponse(
      res,
      {
        ...fullMyWorkOverview,
        period,
        totalCompanyTasks: filteredCompanyTasks.length,
        kpis,
        companyTasks: filteredCompanyTasks,
        myPriorities,
      },
      'Work overview retrieved'
    );
  } catch {
    return successResponse(res, fullMyWorkOverview, 'Work overview retrieved');
  }
};

crmTasksRouter.get('/overview', getWorkOverviewHandler);
crmTasksRouter.get('/work', getWorkOverviewHandler);

crmTasksRouter.get('/daily-reports/today', (_req, res) => {
  successResponse(res, mockDailyReport, 'Today daily report');
});

crmTasksRouter.post('/daily-reports', (_req, res) => {
  successResponse(res, { ok: true, message: 'Daily report submitted' }, 'Daily report submitted', 201);
});

crmTasksRouter.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    if (tasksDoc?.data && Array.isArray(tasksDoc.data)) {
      const found = tasksDoc.data.find((t: any) => t.id === id);
      if (found) {
        return successResponse(res, normalizeTaskDetails(found), 'Task retrieved from database');
      }
    }
  } catch {}
  return successResponse(res, normalizeTaskDetails({ ...mockTask, id }), 'Task retrieved');
});

function normalizeTaskDetails(t: any) {
  const dueStr = t.due?.day && t.due?.time ? `${t.due.day} ${t.due.time}` : t.due || '2026-10-15 11:00 AM';
  const statusLabel = typeof t.status === 'string' ? t.status : t.status?.label || 'In Progress';
  const statusTone = (() => {
    switch (statusLabel) {
      case 'Completed': return 'success';
      case 'In Progress': return 'info';
      case 'Awaiting Review': return 'warning';
      case 'Blocked': return 'danger';
      default: return 'neutral';
    }
  })();
  return {
    id: t.id,
    title: t.title,
    status: { label: statusLabel, tone: statusTone, icon: 'sync' },
    priority: t.priority || 'Normal',
    assignedTo: { name: t.owner?.name || t.assignedTo?.name || 'Amit Kumar', role: t.owner?.role || t.assignedTo?.role || 'Production Executive' },
    assignedBy: { name: t.assignedBy?.name || 'Vijay Sharma', role: t.assignedBy?.role || 'Super Admin' },
    reviewer: { name: t.reviewer?.name || 'Rajesh Kumar', role: t.reviewer?.role || 'Production Manager' },
    department: t.department || 'Production',
    due: dueStr,
    linkedRecord: t.linkedRecord || t.record?.ref || 'SO-0086 · Steam Chamber',
    instructions: t.instructions || 'Check required materials against the order BOM. Confirm available stock and report shortages.',
    checklist: (t.checklist || [
      { id: 'c1', label: 'Verify BOM requirements', done: true },
      { id: 'c2', label: 'Check available inventory', done: true },
      { id: 'c3', label: 'Upload material readiness checklist', done: false },
    ]).map((c: any) => ({ id: c.id || `c${Math.random()}`, label: c.label || c, done: c.done || false })),
    attachments: t.attachments || [{ name: 'Material-list.pdf', size: '240 KB' }],
    latestUpdate: t.latestUpdate || {
      by: 'Amit Kumar',
      at: 'Today, 4:10 PM',
      text: 'Stock checked. One brass fitting is pending supplier confirmation.',
      tag: 'Dependency pending',
    },
    comments: Array.isArray(t.comments) ? t.comments : [{
      id: 'cmt-1',
      by: 'Amit Kumar',
      at: 'Today, 4:10 PM',
      text: 'Stock checked. One brass fitting is pending supplier confirmation.',
    }],
    blocker: t.blocker || { title: 'Supplier confirmation pending', owner: 'Mohit Gupta', ownerRole: 'Purchase Manager', requiredBy: 'Today, 5:30 PM' },
    reviewStatus: t.reviewStatus || { label: 'Not submitted for review', note: 'Completion requires Production Manager approval.' },
    createdBy: t.createdBy || 'Created by Vijay Sharma - 14 Oct, 3:20 PM',
    updatedAt: t.updatedAt || 'Last updated today, 4:10 PM',
    submission: t.submission || {
      submittedAt: '',
      work: '',
      attachments: [],
      summary: [],
    },
  };
}

crmTasksRouter.post('/:id/updates', async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const status = body.status === 'Ready for Review' ? 'Awaiting Review' : (body.status || 'In Progress');
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    let list = tasksDoc?.data && Array.isArray(tasksDoc.data) ? tasksDoc.data : [];
    let task = list.find((t: any) => t.id === id);
    if (!task) {
      const defaultTask = fullMyWorkOverview.companyTasks.find((t: any) => t.id === id);
      if (defaultTask) {
        task = { ...defaultTask };
        list.push(task);
      }
    }
    if (task) {
      task.status = status;
      if (body.completedWork) task.completedWork = body.completedWork;
      if (body.checklist && Array.isArray(body.checklist)) {
        task.checklist = body.checklist.map((cid: string) => ({ id: cid, label: '', done: true }));
      }
      if (body.supportRequested) task.supportRequested = true;
      task.updatedAt = new Date().toISOString();
      await CrmRecord.findOneAndUpdate(
        { key: 'tasks.companyTasks' },
        { key: 'tasks.companyTasks', data: list },
        { upsert: true, new: true }
      );
    }

    // Also update in dashboard.myPriorities if present
    const prioDoc = await CrmRecord.findOne({ key: 'dashboard.myPriorities' });
    if (prioDoc?.data && Array.isArray(prioDoc.data)) {
      const pTask = prioDoc.data.find((p: any) => p.id === id);
      if (pTask) {
        pTask.status = status;
        await CrmRecord.findOneAndUpdate({ key: 'dashboard.myPriorities' }, { data: prioDoc.data });
      }
    }
  } catch (err: any) {
    console.warn('[CRM Tasks] Error updating task progress:', err?.message);
  }
  return successResponse(res, { id, update: body }, 'Update recorded');
});

crmTasksRouter.post('/:id/review', async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const decision = body.decision === 'approve' ? 'Completed' : 'In Progress';
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    let list = tasksDoc?.data && Array.isArray(tasksDoc.data) ? tasksDoc.data : [];
    let task = list.find((t: any) => t.id === id);
    if (!task) {
      const defaultTask = fullMyWorkOverview.companyTasks.find((t: any) => t.id === id);
      if (defaultTask) {
        task = { ...defaultTask };
        list.push(task);
      }
    }
    if (task) {
      task.status = decision;
      task.reviewFeedback = body.feedback || '';
      task.reviewDecision = body.decision || '';
      task.updatedAt = new Date().toISOString();
      await CrmRecord.findOneAndUpdate(
        { key: 'tasks.companyTasks' },
        { key: 'tasks.companyTasks', data: list },
        { upsert: true, new: true }
      );
    }

    const prioDoc = await CrmRecord.findOne({ key: 'dashboard.myPriorities' });
    if (prioDoc?.data && Array.isArray(prioDoc.data)) {
      const pTask = prioDoc.data.find((p: any) => p.id === id);
      if (pTask) {
        pTask.status = decision;
        await CrmRecord.findOneAndUpdate({ key: 'dashboard.myPriorities' }, { data: prioDoc.data });
      }
    }
  } catch (err: any) {
    console.warn('[CRM Tasks] Error reviewing task:', err?.message);
  }
  return successResponse(res, { id, status: decision }, 'Task reviewed');
});

crmTasksRouter.post('/:id/comments', async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return successResponse(res, { id, comment: body }, 'Comment added', 400);
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    if (tasksDoc?.data && Array.isArray(tasksDoc.data)) {
      const task = tasksDoc.data.find((t: any) => t.id === id);
      if (task) {
        if (!Array.isArray(task.comments)) task.comments = [];
        task.comments.push({
          id: `cmt-${Date.now().toString().slice(-4)}`,
          by: body.by || 'Vijay Sharma',
          at: 'Just now',
          text,
        });
        task.latestUpdate = { by: body.by || task.comments[task.comments.length - 1].by, at: 'Just now', text, tag: 'Comment' };
        task.updatedAt = new Date().toISOString();
        await CrmRecord.findOneAndUpdate({ key: 'tasks.companyTasks' }, { data: tasksDoc.data });
      }
    }
  } catch {}
  return successResponse(res, { id, comment: { text } }, 'Comment added', 201);
});

crmTasksRouter.post('/:id/request-update', async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    if (tasksDoc?.data && Array.isArray(tasksDoc.data)) {
      const task = tasksDoc.data.find((t: any) => t.id === id);
      if (task) {
        if (!Array.isArray(task.comments)) task.comments = [];
        task.comments.push({
          id: `cmt-${Date.now().toString().slice(-4)}`,
          by: body.by || 'Reviewer',
          at: 'Just now',
          text: note || 'Update requested.',
        });
        task.latestUpdate = {
          by: body.by || task.comments[task.comments.length - 1].by,
          at: 'Just now',
          text: note || 'Update requested.',
          tag: 'Update requested',
        };
        task.updatedAt = new Date().toISOString();
        await CrmRecord.findOneAndUpdate({ key: 'tasks.companyTasks' }, { data: tasksDoc.data });
      }
    }
  } catch {}
  return successResponse(res, { id, note }, 'Update requested');
});

crmTasksRouter.put('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    let list = tasksDoc?.data && Array.isArray(tasksDoc.data) ? tasksDoc.data : [];
    let task = list.find((t: any) => t.id === id);
    if (!task) {
      const defaultTask = fullMyWorkOverview.companyTasks.find((t: any) => t.id === id);
      if (defaultTask) {
        task = { ...defaultTask };
        list.push(task);
      }
    }
    if (task) {
      Object.assign(task, req.body);
      task.updatedAt = new Date().toISOString();
      await CrmRecord.findOneAndUpdate(
        { key: 'tasks.companyTasks' },
        { key: 'tasks.companyTasks', data: list },
        { upsert: true, new: true }
      );
    }
    const prioDoc = await CrmRecord.findOne({ key: 'dashboard.myPriorities' });
    if (prioDoc?.data && Array.isArray(prioDoc.data)) {
      const pTask = prioDoc.data.find((p: any) => p.id === id);
      if (pTask) {
        Object.assign(pTask, req.body);
        await CrmRecord.findOneAndUpdate({ key: 'dashboard.myPriorities' }, { data: prioDoc.data });
      }
    }
  } catch {}
  return successResponse(res, { id, ...req.body }, 'Task updated');
});

crmTasksRouter.patch('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    let list = tasksDoc?.data && Array.isArray(tasksDoc.data) ? tasksDoc.data : [];
    let task = list.find((t: any) => t.id === id);
    if (!task) {
      const defaultTask = fullMyWorkOverview.companyTasks.find((t: any) => t.id === id);
      if (defaultTask) {
        task = { ...defaultTask };
        list.push(task);
      }
    }
    if (task) {
      Object.assign(task, req.body);
      task.updatedAt = new Date().toISOString();
      await CrmRecord.findOneAndUpdate(
        { key: 'tasks.companyTasks' },
        { key: 'tasks.companyTasks', data: list },
        { upsert: true, new: true }
      );
    }
    const prioDoc = await CrmRecord.findOne({ key: 'dashboard.myPriorities' });
    if (prioDoc?.data && Array.isArray(prioDoc.data)) {
      const pTask = prioDoc.data.find((p: any) => p.id === id);
      if (pTask) {
        Object.assign(pTask, req.body);
        await CrmRecord.findOneAndUpdate({ key: 'dashboard.myPriorities' }, { data: prioDoc.data });
      }
    }
  } catch {}
  return successResponse(res, { id, ...req.body }, 'Task updated');
});

crmTasksRouter.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const deletedDoc = await CrmRecord.findOne({ key: 'tasks.deletedIds' });
    const currentDeleted: string[] = deletedDoc?.data && Array.isArray(deletedDoc.data) ? deletedDoc.data : [];
    if (!currentDeleted.includes(id)) {
      await CrmRecord.findOneAndUpdate(
        { key: 'tasks.deletedIds' },
        { key: 'tasks.deletedIds', data: [...currentDeleted, id] },
        { upsert: true, new: true }
      );
    }

    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    if (tasksDoc?.data && Array.isArray(tasksDoc.data)) {
      tasksDoc.data = tasksDoc.data.filter((t: any) => t.id !== id);
      await CrmRecord.findOneAndUpdate({ key: 'tasks.companyTasks' }, { data: tasksDoc.data });
    }
    const prioDoc = await CrmRecord.findOne({ key: 'dashboard.myPriorities' });
    if (prioDoc?.data && Array.isArray(prioDoc.data)) {
      prioDoc.data = prioDoc.data.filter((p: any) => p.id !== id);
      await CrmRecord.findOneAndUpdate({ key: 'dashboard.myPriorities' }, { data: prioDoc.data });
    }
  } catch (err: any) {
    console.warn('[CRM Tasks] Error deleting task:', err?.message);
  }
  return successResponse(res, { id }, 'Task deleted');
});

crmTasksRouter.post('/:id/reschedule', async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const tasksDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    if (tasksDoc?.data && Array.isArray(tasksDoc.data)) {
      const task = tasksDoc.data.find((t: any) => t.id === id);
      if (task) {
        if (body.newDue) task.due = body.newDue;
        if (body.reason) task.rescheduleReason = body.reason;
        task.updatedAt = new Date().toISOString();
        await CrmRecord.findOneAndUpdate({ key: 'tasks.companyTasks' }, { data: tasksDoc.data });
      }
    }
  } catch {}
  return successResponse(res, { id, ...body }, 'Task rescheduled');
});

crmTasksRouter.post('/', async (req, res) => {
  const body = req.body || {};
  const title = String(body.title || body.task || '').trim();
  const assigneeName = body.assignee || (typeof body.owner === 'object' ? body.owner?.name : body.owner) || '';
  const errors: Record<string, string> = {};
  if (!title) errors.title = 'Task title is required.';
  if (!assigneeName) errors.owner = 'Assignee / owner is required.';
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: Object.values(errors)[0],
      fieldErrors: errors,
      errors: Object.values(errors),
      timestamp: new Date().toISOString(),
    });
  }
  const id = `TSK-${Date.now().toString().slice(-4)}`;

  let day = 'Today';
  let time = '11:00 AM';
  if (body.dueDate) day = body.dueDate;
  if (body.dueTime) time = body.dueTime;
  if (body.due && typeof body.due === 'string') {
    if (body.due.includes('T')) {
      const parts = body.due.split('T');
      day = parts[0];
      time = parts[1];
    } else {
      day = body.due;
    }
  }

  const newTask = {
    id,
    title: body.title || 'New Task',
    task: body.title || 'New Task',
    department: body.department || 'Management',
    owner: { name: assigneeName, role: 'Assignee' },
    due: { day, time, overdue: false },
    priority: body.priority || 'Normal',
    status: body.status || 'To Do',
    action: 'Open',
    instructions: body.description || body.instructions || '',
    reviewer: body.reviewer || 'Vijay Sharma',
    createdAt: new Date().toISOString(),
  };

  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const existingDoc = await CrmRecord.findOne({ key: 'tasks.companyTasks' });
    const current = existingDoc?.data && Array.isArray(existingDoc.data) ? existingDoc.data : [];
    await CrmRecord.findOneAndUpdate(
      { key: 'tasks.companyTasks' },
      { key: 'tasks.companyTasks', data: [newTask, ...current] },
      { upsert: true, new: true }
    );

    // Also update dashboard.myPriorities
    const priorityItem = {
      id,
      task: body.title || 'New Task',
      department: body.department || 'Management',
      time: `${time} (${day})`,
      priority: body.priority || 'Normal',
      owner: assigneeName,
    };
    const prioDoc = await CrmRecord.findOne({ key: 'dashboard.myPriorities' });
    const currentPrio = prioDoc?.data && Array.isArray(prioDoc.data) ? prioDoc.data : [];
    await CrmRecord.findOneAndUpdate(
      { key: 'dashboard.myPriorities' },
      { key: 'dashboard.myPriorities', data: [priorityItem, ...currentPrio] },
      { upsert: true, new: true }
    );

    // Log activity
    const existingActivitiesDoc = await CrmRecord.findOne({ key: 'dashboard.activities' });
    const currentActivities = existingActivitiesDoc?.data || [];
    const newActivity = {
      id: `act-${Date.now().toString().slice(-4)}`,
      at: 'Just now',
      by: assigneeName,
      text: `Task assigned: ${body.title || 'New Task'}`,
      module: body.department || 'Management',
    };
    await CrmRecord.findOneAndUpdate(
      { key: 'dashboard.activities' },
      { key: 'dashboard.activities', data: [newActivity, ...currentActivities] },
      { upsert: true, new: true }
    );
  } catch {}

  return successResponse(res, newTask, 'Task created', 201);
});

export default crmTasksRouter;
