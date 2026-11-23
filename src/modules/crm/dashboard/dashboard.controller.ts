import { Response } from 'express';
import { successResponse } from '../../../utils/api-response';
import { asyncHandler } from '../../../utils/async-handler';

export const getCompanyDashboard = asyncHandler(async (req, res: Response) => {
  const period = (req.query.period as string) || 'All Periods';

  let kpis = {
    salesMtd: { value: '₹18.4L', target: '₹25L', progress: 74 },
    collectionsMtd: { value: '₹12.8L', change: '+12%' },
    receivables: { value: '₹6.8L', overdue: '₹1.2L' },
    cashAndBank: { value: '₹9.4L', change: '+8%' },
    expensesMtd: { value: '₹8.6L', budget: '₹9L', progress: 96 },
    staff: { present: 42, total: 46, rate: 91, onLeave: 2, absent: 2 },
  };

  let workload = {
    completionRate: 80,
    completed: 96,
    total: 120,
    completedChange: '+8%',
    overdue: 12,
    overdueChange: '+2',
    blocked: 4,
    reportsReceived: 9,
    reportsExpected: 11,
    missingReports: ['Purchase', 'Production'],
  };

  let pipeline = {
    segments: [
      { label: 'Equipment', value: '₹14.2L', opportunities: 8 },
      { label: 'Turnkey', value: '₹15.6L', opportunities: 6 },
      { label: 'Consultancy', value: '₹2.8L', opportunities: 5 },
      { label: 'Total Open', value: '₹32.6L', opportunities: 19 },
    ],
    quotationSent: 12,
    inNegotiation: 7,
  };

  let execution = [
    { key: 'projects', label: 'Projects at risk', count: 2 },
    { key: 'qc', label: 'Jobs pending QC', count: 3 },
    { key: 'dispatch', label: 'Dispatches due today', count: 3 },
    { key: 'stock', label: 'Low stock items', count: 5 },
    { key: 'service', label: 'Service tickets open', count: 4 },
  ];

  if (period === 'Today') {
    kpis = {
      salesMtd: { value: '₹2.4L', target: '₹2.0L', progress: 120 },
      collectionsMtd: { value: '₹1.8L', change: '+24%' },
      receivables: { value: '₹6.8L', overdue: '₹0.4L' },
      cashAndBank: { value: '₹9.4L', change: '+2%' },
      expensesMtd: { value: '₹0.6L', budget: '₹0.8L', progress: 75 },
      staff: { present: 43, total: 46, rate: 93, onLeave: 2, absent: 1 },
    };
    workload = {
      completionRate: 88,
      completed: 18,
      total: 20,
      completedChange: '+12%',
      overdue: 1,
      overdueChange: '0',
      blocked: 1,
      reportsReceived: 9,
      reportsExpected: 11,
      missingReports: ['Purchase', 'Production'],
    };
    pipeline = {
      segments: [
        { label: 'Equipment', value: '₹3.5L', opportunities: 2 },
        { label: 'Turnkey', value: '₹4.2L', opportunities: 1 },
        { label: 'Consultancy', value: '₹0.8L', opportunities: 1 },
        { label: 'Total Open', value: '₹8.5L', opportunities: 4 },
      ],
      quotationSent: 3,
      inNegotiation: 2,
    };
    execution = [
      { key: 'projects', label: 'Projects at risk', count: 1 },
      { key: 'qc', label: 'Jobs pending QC', count: 1 },
      { key: 'dispatch', label: 'Dispatches due today', count: 3 },
      { key: 'stock', label: 'Low stock items', count: 5 },
      { key: 'service', label: 'Service tickets open', count: 2 },
    ];
  } else if (period === 'This Week') {
    kpis = {
      salesMtd: { value: '₹8.6L', target: '₹10L', progress: 86 },
      collectionsMtd: { value: '₹5.4L', change: '+15%' },
      receivables: { value: '₹6.8L', overdue: '₹0.8L' },
      cashAndBank: { value: '₹9.4L', change: '+5%' },
      expensesMtd: { value: '₹3.2L', budget: '₹3.8L', progress: 84 },
      staff: { present: 42, total: 46, rate: 91, onLeave: 3, absent: 1 },
    };
    workload = {
      completionRate: 84,
      completed: 48,
      total: 58,
      completedChange: '+6%',
      overdue: 5,
      overdueChange: '+1',
      blocked: 2,
      reportsReceived: 9,
      reportsExpected: 11,
      missingReports: ['Purchase'],
    };
    pipeline = {
      segments: [
        { label: 'Equipment', value: '₹7.8L', opportunities: 4 },
        { label: 'Turnkey', value: '₹8.2L', opportunities: 3 },
        { label: 'Consultancy', value: '₹1.5L', opportunities: 2 },
        { label: 'Total Open', value: '₹17.5L', opportunities: 9 },
      ],
      quotationSent: 8,
      inNegotiation: 5,
    };
  } else if (period === 'This Quarter') {
    kpis = {
      salesMtd: { value: '₹54.2L', target: '₹70L', progress: 77 },
      collectionsMtd: { value: '₹41.5L', change: '+18%' },
      receivables: { value: '₹6.8L', overdue: '₹1.2L' },
      cashAndBank: { value: '₹9.4L', change: '+12%' },
      expensesMtd: { value: '₹24.8L', budget: '₹26L', progress: 95 },
      staff: { present: 42, total: 46, rate: 91, onLeave: 2, absent: 2 },
    };
    workload = {
      completionRate: 82,
      completed: 280,
      total: 340,
      completedChange: '+10%',
      overdue: 15,
      overdueChange: '+3',
      blocked: 6,
      reportsReceived: 9,
      reportsExpected: 11,
      missingReports: ['Purchase', 'Production'],
    };
  }

  const dashboard: any = {
    period,
    kpis,
    departments: [
      {
        key: 'sales',
        name: 'Sales',
        manager: 'Simran Kaur',
        keyActivity: ['24 new leads', '6 uncontacted'],
        tasksDone: 9,
        tasksAssigned: 12,
        overdue: 2,
        status: { label: 'Needs attention', tone: 'danger', icon: 'warning' },
      },
      {
        key: 'marketing',
        name: 'Marketing',
        manager: 'Ritu Sharma',
        keyActivity: ['3 campaigns', '86 leads'],
        tasksDone: 7,
        tasksAssigned: 8,
        overdue: 0,
        status: { label: 'On track', tone: 'success', icon: 'check' },
      },
      {
        key: 'design',
        name: 'Design & Consultancy',
        manager: 'Neha Singh',
        keyActivity: ['5 proposals', '2 reviews'],
        tasksDone: 6,
        tasksAssigned: 8,
        overdue: 1,
        status: { label: 'Review pending', tone: 'warning', icon: 'alert' },
      },
      {
        key: 'projects',
        name: 'Projects & Installation',
        manager: 'Sandeep Kumar',
        keyActivity: ['12 projects', '2 at risk'],
        tasksDone: 14,
        tasksAssigned: 18,
        overdue: 2,
        status: { label: 'At risk', tone: 'danger', icon: 'alert' },
      },
      {
        key: 'production',
        name: 'Production & Dispatch',
        manager: 'Rajesh Kumar',
        keyActivity: ['18 jobs', '3 dispatches due'],
        tasksDone: 19,
        tasksAssigned: 24,
        overdue: 3,
        status: { label: 'Attention needed', tone: 'warning', icon: 'clock' },
      },
      {
        key: 'service',
        name: 'Service & Maintenance',
        manager: 'Anil Rao',
        keyActivity: ['6 open calls', '1 overdue'],
        tasksDone: 5,
        tasksAssigned: 6,
        overdue: 1,
        status: { label: 'Open call', tone: 'warning', icon: 'wrench' },
      },
      {
        key: 'purchase',
        name: 'Purchase & Stores',
        manager: 'Manoj Verma',
        keyActivity: ['3 POs pending', '1 stock low'],
        tasksDone: 8,
        tasksAssigned: 10,
        overdue: 0,
        status: { label: 'On track', tone: 'success', icon: 'check' },
      },
      {
        key: 'accounts',
        name: 'Accounts & Finance',
        manager: 'Pooja Iyer',
        keyActivity: ['GST filing in 4 days', '₹1.2L overdue'],
        tasksDone: 11,
        tasksAssigned: 12,
        overdue: 1,
        status: { label: 'Action required', tone: 'danger', icon: 'warning' },
      },
      {
        key: 'hr',
        name: 'HR & Admin',
        manager: 'Anita Desai',
        keyActivity: ['2 interviews', '1 onboarding'],
        tasksDone: 4,
        tasksAssigned: 5,
        overdue: 0,
        status: { label: 'On track', tone: 'success', icon: 'check' },
      },
    ],
    pipeline,
    execution,
    alerts: [
      {
        id: 'alert-1',
        kind: 'material',
        title: 'Material delay threatens tomorrow delivery',
        detail: 'Purchase · Delivery due tomorrow',
        action: 'Review',
      },
      {
        id: 'alert-2',
        kind: 'leads',
        title: '6 leads exceed response time',
        detail: 'Sales · Older than 48 hours',
        action: 'Assign',
      },
      {
        id: 'alert-3',
        kind: 'approvals',
        title: '3 approvals pending',
        detail: 'Total value: ₹58,200.00',
        action: 'Review',
      },
    ],
    workload,
    myPriorities: [
      { id: 'p1', task: 'Review resort proposal', department: 'Sales', time: '11:30 AM', priority: 'High' },
      { id: 'p2', task: 'Approve purchase request', department: 'Purchase', time: '02:00 PM', priority: 'High' },
      { id: 'p3', task: 'Review project risks', department: 'Projects', time: '03:00 PM', priority: 'Normal' },
    ],
    activities: [
      { id: 'act-1', at: '10:30 AM', by: 'Simran Kaur', text: 'Quotation sent to Aarogya Ayurveda (₹4.5L)', module: 'Sales' },
      { id: 'act-2', at: '11:15 AM', by: 'Rajesh Kumar', text: 'QC passed for Panchkarma Table job card', module: 'Production' },
      { id: 'act-3', at: '12:00 PM', by: 'Pooja Iyer', text: 'NEFT payment received ₹1,00,000', module: 'Accounts' },
    ],
  };

  try {
    const { CrmRecord } = await import('../../../models/crm-record.model');
    const prioritiesDoc = await CrmRecord.findOne({ key: 'dashboard.myPriorities' });
    if (prioritiesDoc && Array.isArray(prioritiesDoc.data) && prioritiesDoc.data.length > 0) {
      if (period === 'Today') {
        dashboard.myPriorities = prioritiesDoc.data.filter((p: any) =>
          (p.time && p.time.toLowerCase().includes('today')) ||
          (p.time && !p.time.includes('(')) ||
          p.priority === 'High' || p.priority === 'Urgent'
        );
        if (dashboard.myPriorities.length === 0) {
          dashboard.myPriorities = prioritiesDoc.data.slice(0, 3);
        }
      } else {
        dashboard.myPriorities = prioritiesDoc.data;
      }
    }

    const activitiesDoc = await CrmRecord.findOne({ key: 'dashboard.activities' });
    if (activitiesDoc && Array.isArray(activitiesDoc.data) && activitiesDoc.data.length > 0) {
      dashboard.activities = activitiesDoc.data;
    }
  } catch (err: any) {
    console.warn('[Dashboard] Warning reading from MongoDB:', err?.message);
  }

  successResponse(res, dashboard, `Dashboard retrieved for ${period}`);
});
