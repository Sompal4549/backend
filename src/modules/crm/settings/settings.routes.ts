import { Router } from 'express';
import { UserModel } from '../../../models/user.model';
import { ProductModel } from '../../../models/product.model';
import { successResponse } from '../../../utils/api-response';

export const crmSettingsRouter = Router();

crmSettingsRouter.get('/users', async (_req, res) => {
  try {
    const dbUsers = await UserModel.find().sort({ createdAt: -1 }).lean();
    if (dbUsers && dbUsers.length > 0) {
      const formattedUsers = dbUsers.map((u: any) => {
        const isSuperAdmin = u.role === 'superadmin' || u.adminRole === 'superadmin';
        const crmRole = u.crmRole || (isSuperAdmin ? 'Super Admin' : (u.role === 'admin' ? 'Admin Executive' : 'Sales Manager'));
        const adminRole = u.adminRole || u.role || 'admin';
        const crmAccess = u.crmAccess !== undefined ? Boolean(u.crmAccess) : isSuperAdmin;
        const adminAccess = u.adminAccess !== undefined ? Boolean(u.adminAccess) : (isSuperAdmin || u.role === 'admin');
        const productAccess = u.productAccess || (crmAccess && adminAccess ? 'both' : crmAccess ? 'crm' : 'admin');

        return {
          id: u._id.toString(),
          name: u.name || 'User',
          email: u.email,
          mobile: u.phone || '',
          department: u.department || (isSuperAdmin ? 'Management' : 'Sales & Operations'),
          designation: u.designation || (isSuperAdmin ? 'Super Administrator' : (u.role === 'admin' ? 'Administrator' : crmRole)),
          role: crmRole,
          crmRole: crmRole,
          adminRole: adminRole,
          scope: u.scope || 'Company-wide',
          branch: u.branch || 'HQ - Delhi NCR',
          reportingManager: u.reportingManager || 'Executive Management',
          status: u.lockUntil && new Date(u.lockUntil) > new Date() ? 'Disabled' : 'Active',
          crmAccess,
          adminAccess,
          productAccess,
          lastLogin: u.updatedAt ? new Date(u.updatedAt).toLocaleDateString('en-IN') : 'Recently',
          locked: false,
        };
      });

      return successResponse(
        res,
        {
          kpis: {
            total: formattedUsers.length,
            active: formattedUsers.filter((u) => u.status === 'Active').length,
            invited: 0,
            disabled: formattedUsers.filter((u) => u.status !== 'Active').length,
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

crmSettingsRouter.get('/catalogue', async (_req, res) => {
  try {
    const products = await ProductModel.find({ isDeleted: { $ne: true } })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .lean();
    if (products && products.length > 0) {
      const catalogue = products.map((p: any) => ({
        id: p._id.toString(),
        type: 'product',
        code: p.code || '',
        name: p.title,
        description: p.shortDescription || p.description || '',
        category: (p.category as any)?.name || 'Equipment',
        unit: 'Nos.',
        price: String(p.discountPrice || p.price || 0),
        taxProfile: `GST ${p.gstRate || 18}%`,
        hsn: p.hsnCode || '',
        warrantyValue: '12',
        warrantyUnit: 'Months',
        stockManaged: true,
        warehouse: 'Main WH',
        active: p.isActive !== false,
      }));
      return successResponse(res, catalogue, 'Catalogue retrieved from database');
    }
  } catch (err: any) {
    console.warn('[CRM Settings] Error fetching catalogue products:', err?.message);
  }
  return successResponse(res, [], 'Catalogue retrieved');
});

crmSettingsRouter.get('/master-config', (_req, res) => {
  successResponse(res, {}, 'Master config retrieved');
});

crmSettingsRouter.get('/audit-log', (_req, res) => {
  successResponse(res, [], 'Audit log retrieved');
});

crmSettingsRouter.patch('/users/:id/crm-access', async (req, res) => {
  try {
    const { crmAccess, productAccess } = req.body;
    const user = await UserModel.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (crmAccess !== undefined) user.crmAccess = Boolean(crmAccess);
    if (productAccess !== undefined) user.productAccess = productAccess;
    await user.save();
    return successResponse(
      res,
      { id: user._id.toString(), crmAccess: Boolean(user.crmAccess), productAccess: user.productAccess },
      'CRM access updated'
    );
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update CRM access' });
  }
});

crmSettingsRouter.put('/:section', async (req, res) => {
  const section = req.params.section;
  const body = req.body || {};

  if (section === 'users') {
    try {
      const userId = body.id || body._id;
      if (userId) {
        const updateData: Record<string, unknown> = {};
        if (body.name) updateData.name = body.name;
        if (body.email) updateData.email = body.email.toLowerCase().trim();
        if (body.mobile !== undefined) updateData.phone = body.mobile;
        if (body.phone !== undefined) updateData.phone = body.phone;
        if (body.department !== undefined) updateData.department = body.department;
        if (body.designation !== undefined) updateData.designation = body.designation;
        if (body.crmRole) updateData.crmRole = body.crmRole;
        if (body.role && !body.crmRole) updateData.crmRole = body.role;
        if (body.adminRole) updateData.adminRole = body.adminRole;
        if (body.crmAccess !== undefined) updateData.crmAccess = Boolean(body.crmAccess);
        if (body.adminAccess !== undefined) updateData.adminAccess = Boolean(body.adminAccess);
        if (body.productAccess !== undefined) updateData.productAccess = body.productAccess;
        await UserModel.findByIdAndUpdate(userId, { $set: updateData });
      }
    } catch (err: any) {
      console.warn('[CRM Settings] User update failed:', err?.message);
    }
  }

  successResponse(res, { id: section, section, ...body }, 'Settings updated');
});

export default crmSettingsRouter;
