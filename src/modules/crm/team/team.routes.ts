import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';

export const crmTeamRouter = Router();

const month = { present: 12, absent: 1, scheduled: 13 };

const mockAttendance = {
  date: new Date().toISOString().slice(0, 10),
  teamSize: 46,
  summary: { present: 42, leave: 2, absent: 2 },
  rows: [
    {
      staffId: 'EMP-0018',
      name: 'Amit Kumar',
      department: 'Production',
      branch: 'Ghaziabad',
      status: 'Present',
      checkIn: '09:10',
      checkOut: '18:00',
      scheduled: '09:00 – 18:00',
      source: 'Manual Entry',
      notes: 'Reached 10 minutes late due to client meeting.',
      month,
    },
    {
      staffId: 'ST-1001',
      name: 'Vijay Sharma',
      department: 'Management',
      branch: 'Ghaziabad',
      status: 'Present',
      checkIn: '09:00',
      checkOut: '18:30',
      scheduled: '09:00 – 18:00',
      source: 'Biometric',
      notes: '',
      month,
    },
    {
      staffId: 'ST-1002',
      name: 'Simran Kaur',
      department: 'Sales',
      branch: 'Ghaziabad',
      status: 'Present',
      checkIn: '09:15',
      checkOut: '18:15',
      scheduled: '09:00 – 18:00',
      source: 'Mobile app',
      notes: '',
      month,
    },
    {
      staffId: 'ST-1003',
      name: 'Rajesh Kumar',
      department: 'Production',
      branch: 'Ghaziabad',
      status: 'Present',
      checkIn: '09:05',
      checkOut: '18:00',
      scheduled: '09:00 – 18:00',
      source: 'Biometric',
      notes: '',
      month,
    },
    {
      staffId: 'ST-1004',
      name: 'Mohit Gupta',
      department: 'Purchase',
      branch: 'Noida',
      status: 'Present',
      checkIn: '09:20',
      checkOut: '18:00',
      scheduled: '09:00 – 18:00',
      source: 'Biometric',
      notes: '',
      month,
    },
    {
      staffId: 'ST-1006',
      name: 'Kiran Sharma',
      department: 'Office Admin',
      branch: 'Ghaziabad',
      status: 'Leave',
      checkIn: '',
      checkOut: '',
      scheduled: '09:00 – 18:00',
      source: 'Leave',
      notes: 'Casual leave approved.',
      month: { present: 11, absent: 0, scheduled: 13 },
    },
  ],
};

const presentStatus = { label: 'Present', tone: 'success' };

const teamOverview = {
  kpis: { present: 42, total: 46, rate: 91, onLeave: 2, absent: 2, officeRequests: 4 },
  totalMembers: 46,
  members: [
    {
      id: 'emp-1',
      name: 'Simran Kaur',
      department: 'Sales',
      role: 'Sales Manager',
      reportsTo: 'Vijay Sharma',
      attendance: presentStatus,
      tasksDue: 8,
    },
    {
      id: 'emp-2',
      name: 'Amit Kumar',
      department: 'Production',
      role: 'Production Executive',
      reportsTo: 'Rajesh Kumar',
      attendance: presentStatus,
      tasksDue: 3,
    },
    {
      id: 'emp-3',
      name: 'Rajesh Kumar',
      department: 'Production',
      role: 'Production Manager',
      reportsTo: 'Vijay Sharma',
      attendance: presentStatus,
      tasksDue: 5,
    },
    {
      id: 'emp-4',
      name: 'Mohit Gupta',
      department: 'Purchase',
      role: 'Purchase Manager',
      reportsTo: 'Vijay Sharma',
      attendance: presentStatus,
      tasksDue: 4,
    },
    {
      id: 'emp-5',
      name: 'Preet Kaur',
      department: 'Accounts',
      role: 'Accounts Manager',
      reportsTo: 'Vijay Sharma',
      attendance: presentStatus,
      tasksDue: 3,
    },
    {
      id: 'emp-6',
      name: 'Kiran Sharma',
      department: 'Office Admin',
      role: 'Admin Executive',
      reportsTo: 'Vijay Sharma',
      attendance: { label: 'On leave', tone: 'accent' },
      tasksDue: 1,
    },
  ],
  officeRequests: [
    {
      id: 'OR-0021',
      type: 'Equipment Request',
      description: 'Printer servicing',
      raisedBy: 'Kiran Sharma',
      status: { label: 'Assigned', tone: 'success' },
      due: '15 Oct 2026',
    },
    {
      id: 'OR-0022',
      type: 'Equipment Request',
      description: 'Laptop repair',
      raisedBy: 'IT Support',
      status: { label: 'Review pending', tone: 'accent' },
      due: '16 Oct 2026',
    },
  ],
  attendance: { rate: 91, present: 42, onLeave: 2, absent: 2, total: 46, updatedAt: '10:00 AM, Today' },
  pendingDecisions: [
    { key: 'leave', title: '2 leave requests', subtitle: 'Pending approval' },
    { key: 'equipment', title: '1 equipment request', subtitle: 'Pending approval' },
    { key: 'maintenance', title: '1 maintenance request', subtitle: 'Pending approval' },
  ],
};

crmTeamRouter.get('/overview', (_req, res) => {
  successResponse(res, teamOverview, 'Team overview retrieved');
});

crmTeamRouter.get('/members/:id', (req, res) => {
  const member = {
    id: req.params.id,
    name: 'Amit Kumar',
    role: 'Production Executive',
    department: 'Production',
    location: 'Ghaziabad',
    roleType: 'Staff',
    recordScope: 'Own',
    status: 'Active',
    reportsTo: 'Rajesh Kumar',
    assignedBy: 'Vijay Sharma',
    phone: '+91 98765 00010',
    email: 'amit.kumar@ensis.in',
    work: { assigned: 12, completed: 9, inProgress: 2, blocked: 1 },
    currentWork: [
      { job: 'JB0090', description: 'Equipment package assembly for SO0090', status: 'In Progress', assignedOn: '17 Nov 2026', due: '23 Nov 2026' },
    ],
    attendance: { scheduled: 13, present: 12, absent: 1 },
    leaves: [{ id: 'LV-2026-0021', period: '02 Oct – 02 Oct 2026', days: 1, category: 'Sick Leave', status: 'Approved' }],
    documents: [],
    access: { role: 'Staff', modules: ['My Work', 'Production & Dispatch', 'Inventory (view)'] },
  };
  successResponse(res, member, 'Member details retrieved');
});

crmTeamRouter.get('/attendance', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  successResponse(res, { ...mockAttendance, date }, 'Attendance retrieved');
});

crmTeamRouter.get('/leave-requests/:id', (req, res) => {
  const leave = {
    id: req.params.id,
    staffId: 'ST-1003',
    staffName: 'Amit Mehta',
    department: 'Projects',
    period: '20 Nov – 21 Nov 2026',
    days: 2,
    category: 'Casual Leave',
    reason: 'Family function in home town',
    status: 'Pending Approval',
    appliedOn: '16 Nov 2026',
  };
  successResponse(res, leave, 'Leave request retrieved');
});

export default crmTeamRouter;
