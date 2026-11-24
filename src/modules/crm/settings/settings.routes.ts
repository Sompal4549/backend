import { Router } from 'express';
import { UserModel } from '../../../models/user.model';
import { successResponse } from '../../../utils/api-response';

export const crmSettingsRouter = Router();

crmSettingsRouter.get('/users', async (_req, res) => {
  try {
    const dbUsers = await UserModel.find({}).sort({ createdAt: -1 }).lean();
    if (dbUsers && dbUsers.length > 0) {
      const formattedUsers = dbUsers.map((u) => ({
        id: u._id.toString(),
        name: u.name || 'User',
        email: u.email,
        mobile: u.phone || '',
        department: u.role === 'superadmin' ? 'Management' : 'Sales & Operations',
        designation: u.role === 'superadmin' ? 'Super Administrator' : 'Executive',
        role: u.role === 'superadmin' ? 'Super Admin' : 'Staff',
        scope: 'Company-wide',
        branch: 'HQ - Delhi NCR',
        reportingManager: 'Executive Management',
        status: 'Active',
        lastLogin: u.updatedAt ? new Date(u.updatedAt).toLocaleDateString('en-IN') : 'Recently',
        locked: false,
      }));

      return successResponse(
        res,
        {
          kpis: {
            total: formattedUsers.length,
            active: formattedUsers.length,
            invited: 0,
            disabled: 0,
          },
          users: formattedUsers,
          accessChanges: [
            {
              user: formattedUsers[0]?.name || 'Admin',
              change: 'Role verified',
              detail: formattedUsers[0]?.role || 'Super Admin',
              updatedBy: 'System Security',
              at: 'Today',
            },
          ],
        },
        'Users retrieved'
      );
    }
  } catch (err) {
    console.warn('[CRM Settings] DB users fetch fallback:', (err as any)?.message);
  }

  // Standalone fallback if DB is empty
  return successResponse(
    res,
    {
      kpis: { total: 3, active: 3, invited: 0, disabled: 0 },
      users: [
        {
          id: 'user-sompal',
          name: 'Sompal',
          email: 'somfrontenddeveloper@gmail.com',
          mobile: '',
          department: 'Management',
          designation: 'Super Administrator',
          role: 'Super Admin',
          scope: 'Company-wide',
          branch: 'HQ - Delhi NCR',
          reportingManager: 'Executive Board',
          status: 'Active',
          lastLogin: 'Recently',
          locked: false,
        },
        {
          id: 'user-vijay',
          name: 'Vijay Sharma',
          email: 'vijay@ensis.in',
          mobile: '',
          department: 'Management',
          designation: 'Director',
          role: 'Super Admin',
          scope: 'Company-wide',
          branch: 'HQ - Delhi NCR',
          reportingManager: 'Executive Board',
          status: 'Active',
          lastLogin: 'Recently',
          locked: false,
        },
        {
          id: 'user-simran',
          name: 'Simran Kaur',
          email: 'simran@ensis.in',
          mobile: '',
          department: 'Sales & Operations',
          designation: 'Sales Lead',
          role: 'Staff',
          scope: 'Department',
          branch: 'Delhi Branch',
          reportingManager: 'Vijay Sharma',
          status: 'Active',
          lastLogin: 'Recently',
          locked: false,
        },
      ],
      accessChanges: [
        {
          user: 'Sompal',
          change: 'Superadmin assigned',
          detail: 'Full Workspace Access',
          updatedBy: 'System',
          at: 'Today',
        },
      ],
    },
    'Users retrieved'
  );
});

crmSettingsRouter.get('/roles', (_req, res) => {
  const rolesData = {
    modules: ['Leads', 'Pipeline', 'Quotations', 'Accounts', 'Inventory', 'Production', 'Tasks', 'Settings'],
    roles: [
      {
        role: 'Super Admin',
        department: 'Executive Management',
        scope: 'Company-wide',
        userCount: 2,
        locked: true,
        matrix: {
          Leads: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
          Pipeline: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
          Quotations: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
          Accounts: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
          Inventory: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
          Production: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
          Tasks: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
          Settings: ['view', 'add', 'edit', 'delete', 'approve', 'export'],
        },
      },
    ],
  };
  successResponse(res, rolesData, 'Roles retrieved');
});

crmSettingsRouter.get('/approval-rules', (_req, res) => {
  successResponse(res, [], 'Approval rules retrieved');
});

crmSettingsRouter.get('/notifications', (_req, res) => {
  successResponse(res, {}, 'Notification settings retrieved');
});

crmSettingsRouter.get('/integrations', (_req, res) => {
  successResponse(res, {}, 'Integration settings retrieved');
});

crmSettingsRouter.get('/company', (_req, res) => {
  const company = {
    brandName: 'ENSIS',
    legalName: 'Design House India Pvt Ltd',
    description: 'Wellness furniture & healthcare solutions',
    website: 'ensis.in',
    currency: 'INR – Indian Rupee (₹)',
    timezone: 'Asia/Kolkata (IST)',
    gstin: '07AAAAA0000A1Z5',
    registeredAddress: 'Plot 14, Industrial Area, Delhi NCR',
    businessEmail: 'info@ensis.in',
    phone: '+91 98100 00000',
    branches: [
      { id: 'b1', name: 'Ghaziabad HQ', address: 'Plot 14, Industrial Area', contact: 'info@ensis.in', manager: 'Vijay Sharma', status: 'Active' },
      { id: 'b2', name: 'Delhi', address: 'Connaught Place, New Delhi', contact: 'delhi@ensis.in', manager: 'Simran Kaur', status: 'Active' },
      { id: 'b3', name: 'Mumbai', address: 'Andheri East, Mumbai', contact: 'mumbai@ensis.in', manager: 'Rajesh Kumar', status: 'Active' },
    ],
  };
  successResponse(res, company, 'Company profile retrieved');
});

crmSettingsRouter.get('/catalogue', (_req, res) => {
  successResponse(res, [], 'Catalogue retrieved');
});

crmSettingsRouter.get('/master-config', (_req, res) => {
  successResponse(res, {}, 'Master config retrieved');
});

crmSettingsRouter.get('/audit-log', (_req, res) => {
  successResponse(res, [], 'Audit log retrieved');
});

crmSettingsRouter.put('/:section', (req, res) => {
  successResponse(res, { id: req.params.section, section: req.params.section, ...req.body }, 'Settings updated');
});

export default crmSettingsRouter;
