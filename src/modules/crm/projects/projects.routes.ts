import { Router } from 'express';
import { successResponse } from '../../../utils/api-response';
import { inPeriod, optionMatch, readQuery, textMatch } from '../crm-filters';

export const crmProjectsRouter = Router();

const mockProject = {
  id: 'PJ-2026-0018',
  name: 'Aarogya Clinic Turnkey',
  status: 'At risk',
  client: 'Aarogya Ayurveda',
  opportunity: 'OP-0043 / Turnkey',
  contractValue: 1800000,
  billed: 1224000,
  manager: 'Sandeep Kumar',
  site: 'Jaipur',
  progress: 68,
  nextMilestone: '2026-12-10',
  riskReason: 'Pending electrical clearance',
  type: 'Turnkey',
  scope: 'Interior, furniture, installation & handover',
  start: '2026-09-01',
  plannedEnd: '2026-12-25',
  milestones: [
    { id: 'm1', name: 'Site Survey Completed', owner: 'Sandeep Kumar', due: '2026-09-05', status: 'Completed', progress: 100, weight: 18 },
    { id: 'm2', name: 'Design Approved', owner: 'Neha Singh', due: '2026-09-20', status: 'Completed', progress: 100, weight: 22 },
    { id: 'm3', name: 'Equipment Delivery', owner: 'Rajesh Kumar', due: '2026-11-15', status: 'In Progress', progress: 80, weight: 30 },
    { id: 'm4', name: 'Final Handover', owner: 'Sandeep Kumar', due: '2026-12-25', status: 'Pending', progress: 0, weight: 30 },
  ],
  team: [{ id: 't1', name: 'Neha Verma', role: 'Design Lead' }],
  suppliers: [{ id: 's1', name: 'Urban MEP Solutions', category: 'MEP' }],
  attachments: [{ name: 'Project_Brief_Aarogya.pdf', size: '456 KB' }],
  tasks: [
    { task: 'Finalize procurement list', owner: 'Rajesh Kumar', due: '15 Oct 2026', status: 'Done' },
    { task: 'Receive and inspect items', owner: 'Amit Verma', due: '17 Oct 2026', status: 'In progress' },
    { task: 'Site installation work', owner: 'Amit Verma', due: '24 Oct 2026', status: 'In progress' },
    { task: 'Quality check & snag list', owner: 'Neha Singh', due: '28 Oct 2026', status: 'Pending' },
    { task: 'Electrical clearance follow-up', owner: 'Sandeep Kumar', due: '16 Oct 2026', status: 'In progress' },
    { task: 'Handover documentation', owner: 'Sandeep Kumar', due: '30 Oct 2026', status: 'Pending' },
  ],
  production: { orders: 2, items: 6, completed: 4, inProduction: 2, targetCompletion: '16 Oct 2026' },
  siteVisits: [
    { date: '05 Sep 2026', engineer: 'Sandeep Kumar', purpose: 'Site survey', outcome: 'Measurements captured' },
    { date: '02 Oct 2026', engineer: 'Amit Verma', purpose: 'Installation readiness', outcome: 'Electrical pending' },
  ],
  documents: [
    { name: 'Approved_Layout_Rev2.pdf', size: '2.1 MB' },
    { name: 'BOQ_Aarogya.xlsx', size: '184 KB' },
  ],
  costs: [
    { head: 'Furniture & equipment', budget: 1100000, actual: 980000 },
    { head: 'MEP works', budget: 350000, actual: 210000 },
    { head: 'Installation labour', budget: 200000, actual: 120000 },
    { head: 'Logistics', budget: 150000, actual: 64000 },
  ],
};

crmProjectsRouter.get('/overview', (req, res) => {
  const atRisk = { label: 'At risk', tone: 'danger', icon: 'warning' };
  const onTrack = { label: 'On track', tone: 'success', icon: 'check' };
  const pending = { label: 'Pending', tone: 'warning', icon: 'clock' };

  const projectsOverview = {
    kpis: { active: 12, activeChange: '+2', atRisk: 2, atRiskChange: '+1', siteVisitsDue: 3, awaitingHandover: 1 },
    projects: [
      { id: 'PJ-0018', name: 'Serene Resort', client: 'Serene Resort', city: 'Goa', type: 'Turnkey', manager: 'Sandeep Kumar', stage: { label: 'Installation', tone: 'info' }, progress: 68, nextMilestone: { date: '17 Dec 2026', label: 'Site readiness' }, status: atRisk },
      { id: 'PJ-0019', name: 'Wellness Spa', client: 'Wellness Spa', city: 'Kochi', type: 'Equipment', manager: 'Sandeep Kumar', stage: { label: 'Execution', tone: 'success' }, progress: 45, nextMilestone: { date: '20 Dec 2026', label: 'Electrical works' }, status: onTrack },
      { id: 'PJ-0020', name: 'Retreat Spaces', client: 'Retreat Spaces', city: 'Mumbai', type: 'Turnkey', manager: 'Neha Singh', stage: { label: 'Design approval', tone: 'warning' }, progress: 30, nextMilestone: { date: '18 Dec 2026', label: 'Layout approval' }, status: onTrack },
      { id: 'PJ-0021', name: 'Healing Centre', client: 'Healing Centre', city: 'Delhi', type: 'Consultancy', manager: 'Neha Singh', stage: { label: 'Consultancy', tone: 'violet' }, progress: 80, nextMilestone: { date: '16 Dec 2026', label: 'Final report' }, status: { label: 'Review pending', tone: 'warning', icon: 'clock' } },
    ],
    milestones: [
      { projectId: 'PJ-0018', milestone: 'Site readiness', owner: 'Sandeep Kumar', due: '17 Dec', status: atRisk },
      { projectId: 'PJ-0019', milestone: 'Electrical works', owner: 'Sandeep Kumar', due: '20 Dec', status: onTrack },
      { projectId: 'PJ-0020', milestone: 'Layout approval', owner: 'Neha Singh', due: '18 Dec', status: onTrack },
      { projectId: 'PJ-0021', milestone: 'Final report', owner: 'Neha Singh', due: '16 Dec', status: pending },
      { projectId: 'PJ-0017', milestone: 'Equipment delivery', owner: 'Rajesh Kumar', due: '17 Dec', status: onTrack },
    ],
    risks: [
      {
        risk: 'Material delay for spa equipment',
        projectId: 'PJ-0018',
        owner: 'Sandeep Kumar',
        targetDate: '18 Dec 2026',
        severity: { label: 'High', tone: 'danger', icon: 'warning' },
      },
      {
        risk: 'Client layout approval pending',
        projectId: 'PJ-0020',
        owner: 'Neha Singh',
        targetDate: '19 Dec 2026',
        severity: { label: 'Medium', tone: 'warning', icon: 'clock' },
      },
    ],
    siteActions: [
      {
        id: 'sa-1',
        ref: 'SV-0034',
        label: 'Site visit',
        projectId: 'PJ-0018',
        client: 'Serene Resort',
        city: 'Goa',
        date: '15 Dec 2026',
        time: '11:00 AM',
        status: { label: 'Scheduled', tone: 'success', icon: 'check' },
      },
      {
        id: 'sa-2',
        label: 'Handover check',
        projectId: 'PJ-0016',
        client: 'Harmony Spa',
        city: 'Bengaluru',
        date: '16 Dec 2026',
        time: '03:00 PM',
        status: pending,
      },
    ],
  };
  const q = readQuery(req, 'q', 'type', 'manager', 'stage', 'period');
  const projects = projectsOverview.projects.filter(
    (project) =>
      textMatch(q, project.id, project.name, project.client, project.city) &&
      optionMatch(project.type, q.type) &&
      optionMatch(project.manager, q.manager) &&
      optionMatch(project.stage.label, q.stage) &&
      inPeriod(project.nextMilestone.date, q.period),
  );
  const visible = new Set(projects.map((project) => project.id));
  const milestones = projectsOverview.milestones.filter(
    (milestone) => visible.has(milestone.projectId) && inPeriod(milestone.due, q.period),
  );
  const risks = projectsOverview.risks.filter(
    (risk) => visible.has(risk.projectId) && inPeriod(risk.targetDate, q.period),
  );
  const siteActions = projectsOverview.siteActions.filter(
    (action) => visible.has(action.projectId) && inPeriod(action.date, q.period),
  );

  successResponse(
    res,
    { ...projectsOverview, projects, milestones, risks, siteActions },
    'Projects overview retrieved',
  );
});

crmProjectsRouter.get('/new', (_req, res) => {
  successResponse(res, { ...mockProject, id: `PJ-2026-${Math.floor(Math.random() * 800 + 100)}` }, 'New project draft');
});

crmProjectsRouter.get('/:id', (req, res) => {
  successResponse(res, { ...mockProject, id: req.params.id }, 'Project retrieved');
});

crmProjectsRouter.get('/:id/plan', (req, res) => {
  successResponse(res, { projectId: req.params.id, milestones: mockProject.milestones }, 'Project plan retrieved');
});

crmProjectsRouter.get('/:id/costs', (req, res) => {
  const costs = {
    projectId: req.params.id,
    contractValue: mockProject.contractValue,
    billed: mockProject.billed,
    received: 1000000,
    expenses: 650000,
    margin: '38%',
  };
  successResponse(res, costs, 'Project costs retrieved');
});

crmProjectsRouter.get('/site-visits/new', (_req, res) => {
  successResponse(
    res,
    {
      id: 'SV-2026-0035',
      project: 'PJ-0018 / Serene Resort',
      client: 'Serene Resort',
      location: 'Goa',
      visitDate: new Date().toISOString().slice(0, 10),
      engineer: 'Sandeep Kumar',
      status: 'Scheduled',
    },
    'New site visit draft'
  );
});

crmProjectsRouter.get('/:id/edit', (_req, res) => {
  successResponse(
    res,
    {
      id: mockProject.id,
      name: mockProject.name,
      type: mockProject.type,
      client: mockProject.client,
      opportunity: mockProject.opportunity,
      site: mockProject.site,
      address: '',
      start: mockProject.start,
      target: '',
      budget: mockProject.contractValue,
      priority: 'Normal',
      manager: 'Sandeep Kumar',
      assignedBy: '',
      sponsor: '',
      scope: ['Interior, furniture, installation & handover'],
      milestones: mockProject.milestones,
      team: mockProject.team,
      suppliers: mockProject.suppliers,
      attachments: [],
    },
    'Project edit draft'
  );
});

crmProjectsRouter.get('/:id/handover', (_req, res) => {
  successResponse(
    res,
    {
      projectId: mockProject.id,
      client: mockProject.client,
      project: mockProject.name,
      contact: '',
      site: mockProject.site,
      manager: 'Sandeep Kumar',
      status: 'Handover Draft',
      handoverDate: new Date().toISOString().slice(0, 10),
      warrantyStart: '',
      items: [
        { id: 'hi-001', title: 'Verify all deliverables completed', description: '', status: 'Pending', owner: '', date: '', evidence: '' },
        { id: 'hi-002', title: 'Obtain client signoff', description: '', status: 'Pending', owner: '', date: '', evidence: '' },
        { id: 'hi-003', title: 'Transfer warranty documents', description: '', status: 'Pending', owner: '', date: '', evidence: '' },
      ],
      issues: [
        { id: 'issue-001', title: 'Outstanding payment', description: '', owner: '', due: '', status: 'Pending' },
      ],
      documents: [],
      notes: '',
      signedBy: '',
    },
    'Project handover draft'
  );
});

export default crmProjectsRouter;
