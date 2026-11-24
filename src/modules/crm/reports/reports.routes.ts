import { Router } from 'express';
import path from 'path';
import { successResponse } from '../../../utils/api-response';

export const crmReportsRouter = Router();

let reportPagesMock: Record<string, any> = {};
try {
  const reportsPath = path.resolve(__dirname, '../../../../../ensis_crm/src/mocks/report-pages');
  const mod = require(reportsPath);
  reportPagesMock = mod.reportPagesMock || {};
} catch (err) {
  console.warn('[CRM Reports] Warning: Could not load frontend report-pages mock:', (err as any)?.message);
}

crmReportsRouter.get('/overview', (_req, res) => {
  const reportsOverview = {
    summary: { reportTypes: 10, updatedAt: '10:30 AM (IST)' },
    reports: [
      { key: 'sales', name: 'Sales & Conversion', description: 'Track leads, opportunities, win rate and revenue conversion across time periods.' },
      { key: 'lead-sources', name: 'Lead Sources', description: 'Analyse lead sources, campaign performance and opportunity pipeline.' },
      { key: 'quotations', name: 'Quotations & Orders', description: 'View quotations, order value, conversion rate and order status.' },
      { key: 'projects', name: 'Project Progress', description: 'Track project status, milestones, timelines and profitability.' },
      { key: 'production', name: 'Production & Dispatch', description: 'Monitor production plans, job cards, dispatch status and on-time delivery.' },
      { key: 'purchase', name: 'Purchase & Stock', description: 'Purchase orders, vendor fulfilment, inventory turnover and price trends.' },
      { key: 'receivables', name: 'Receivables & Aging', description: 'Track outstanding payments, customer aging buckets and collection efficiency.' },
      { key: 'expenses', name: 'Operational Expenses', description: 'Department budgets, petty cash, vendor payments and project expenses.' },
      { key: 'team', name: 'Team Productivity', description: 'Staff workload, task completion, attendance rates and leave analytics.' },
      { key: 'service', name: 'Service & Maintenance', description: 'AMC visits, complaint resolution time, warranty claims and customer feedback.' },
    ],
    quickSettings: [
      { key: 'users', title: 'User Management', description: 'Invite staff, manage roles, departments, active sessions and permissions.' },
      { key: 'approvals', title: 'Approval Hierarchy', description: 'Configure approval workflows for quotations, purchases, expenses and leaves.' },
      { key: 'notifications', title: 'Notification Alerts', description: 'Configure email, WhatsApp, and in-app alerts for milestone events.' },
      { key: 'numbering', title: 'Document Numbering', description: 'Prefixes, sequences, and financial year resets for invoices, POs, and jobs.' },
    ],
    audit: [
      { key: 'export', label: 'Data Export', detail: 'CSV and Excel exports of transactions and records', action: 'Configure' },
      { key: 'audit', label: 'Security & Audit Log', detail: 'Track admin actions, user logins and sensitive changes', status: 'Enabled', action: 'View' },
      { key: 'imports', label: 'Import History', detail: 'View imported lead batches, mapping files and logs', action: 'View' },
      { key: 'backup', label: 'System Backup', detail: 'Automated daily database snapshot to encrypted cloud storage', status: 'Healthy', action: 'Configure' },
    ],
    configActivity: [
      { activity: 'Role Permissions Modified', detail: 'Updated Quotation Approval threshold for Sales Manager', updatedBy: 'Vijay Sharma', date: 'Yesterday', time: '04:15 PM' },
      { activity: 'Approval Rule Added', detail: 'PO > ₹50,000 now requires Managing Director approval', updatedBy: 'Vijay Sharma', date: '14 Nov 2026', time: '11:20 AM' },
      { activity: 'Email Notification Updated', detail: 'New Lead auto-assignment email template updated', updatedBy: 'Simran Kaur', date: '12 Nov 2026', time: '02:40 PM' },
    ],
  };
  successResponse(res, reportsOverview, 'Reports overview retrieved');
});

crmReportsRouter.get('/catalog', (_req, res) => {
  const catalog = [
    { key: 'monthly-sales-summary', title: 'Monthly Sales & Revenue Report', category: 'Sales' },
    { key: 'project-timeline-variance', title: 'Project Timeline Variance', category: 'Operations' },
    { key: 'inventory-aging', title: 'Inventory Aging Report', category: 'Supply Chain' },
  ];
  successResponse(res, catalog, 'Reports catalog retrieved');
});

crmReportsRouter.get('/:key', (req, res) => {
  const key = req.params.key;
  const page = reportPagesMock[key];
  if (page && page.layout) {
    const from = (req.query.from as string) || page.from;
    const to = (req.query.to as string) || page.to;
    const asOf = (req.query.asOf as string) || page.asOf;
    return successResponse(res, { ...page, from, to, asOf }, `Report ${key} retrieved`);
  }

  return res.status(404).json({
    success: false,
    message: `Report ${key} not found or requires client layout rendering`,
  });
});

export default crmReportsRouter;
