import { Router } from 'express';
import { UserModel } from '../../../models/user.model';
import { ProductModel } from '../../../models/product.model';
import { CategoryModel } from '../../../models/category.model';
import { CrmRecord } from '../../../models/crm-record.model';
import { getApprovedPricingConfig } from '../quotations/quotation-controls.service';
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

crmSettingsRouter.get('/catalogue-overview', async (_req, res) => {
  try {
    const [products, categories, aiMetaDoc, pricingConfig] = await Promise.all([
      ProductModel.find({ isDeleted: { $ne: true } })
        .populate('category', 'name')
        .sort({ orderBy: 1, createdAt: -1 })
        .lean(),
      CategoryModel.find({ isDeleted: { $ne: true } }).sort({ name: 1 }).lean(),
      CrmRecord.findOne({ key: 'catalogue.aiMetadata' }).lean<any>(),
      getApprovedPricingConfig(),
    ]);

    const aiMetaMap: Record<string, any> =
      aiMetaDoc && !Array.isArray(aiMetaDoc) && aiMetaDoc.data && typeof aiMetaDoc.data === 'object'
        ? aiMetaDoc.data
        : {};

    const defaultPriceVersion = pricingConfig?.priceListVersion || 'V2026.11';

    const cleanHtmlText = (val: unknown) =>
      String(val || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const items = (products || []).map((p: any, idx: number) => {
      const id = p._id.toString();
      const meta = aiMetaMap[id] || {};
      const hasContent = Boolean((p.description && p.description.trim().length >= 20) || (p.shortDescription && p.shortDescription.trim().length >= 10));
      const defaultStatus: 'Approved' | 'Awaiting review' | 'Excluded' =
        p.isActive === false ? 'Excluded' : hasContent ? 'Approved' : 'Awaiting review';
      const aiStatus: 'Approved' | 'Awaiting review' | 'Excluded' =
        meta.aiStatus === 'Approved' || meta.aiStatus === 'Awaiting review' || meta.aiStatus === 'Excluded'
          ? meta.aiStatus
          : defaultStatus;

      const kbPrefix = `KB-${String(idx + 1).padStart(3, '0')}`;
      const knowledgeVersion =
        meta.knowledgeVersion || (aiStatus === 'Awaiting review' ? `${kbPrefix} / draft` : `${kbPrefix} / v1`);

      return {
        id,
        title: cleanHtmlText(p.title),
        slug: p.slug || '',
        code: p.code || `SKU-${id.slice(-6).toUpperCase()}`,
        variant: cleanHtmlText(p.subcategory || p.material || (p.isActive === false ? 'inactive' : 'configured variant')),
        category: cleanHtmlText((p.category as any)?.name || 'Equipment'),
        categoryId: (p.category as any)?._id?.toString() || '',
        description: cleanHtmlText(p.shortDescription || p.description || ''),
        fullDescription: cleanHtmlText(p.description || ''),
        price: Number(p.price || 0),
        discountPrice: p.discountPrice !== undefined && p.discountPrice !== null ? Number(p.discountPrice) : null,
        effectivePrice: Number(p.discountPrice || p.price || 0),
        gstRate: Number(p.gstRate ?? 18),
        hsnCode: p.hsnCode || '',
        stock: Number(p.stock ?? 0),
        isActive: p.isActive !== false,
        isFeatured: Boolean(p.isFeatured),
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '',
        knowledgeVersion,
        priceVersion: meta.priceVersion || defaultPriceVersion,
        aiStatus,
        owner: meta.owner || 'Catalogue Admin',
        reviewNote: meta.reviewNote || '',
        updatedAt: meta.updatedAt || p.updatedAt || p.createdAt || new Date().toISOString(),
      };
    });

    const summary = {
      total: items.length,
      aiEligible: items.filter((item) => item.aiStatus === 'Approved').length,
      awaitingReview: items.filter((item) => item.aiStatus === 'Awaiting review').length,
      expiredExcluded: items.filter((item) => item.aiStatus === 'Excluded').length,
    };

    const categoryList = (categories || []).map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
    }));

    return successResponse(
      res,
      {
        items,
        categories: categoryList,
        summary,
        priceListVersion: defaultPriceVersion,
      },
      'Product catalogue overview retrieved'
    );
  } catch (err: any) {
    console.warn('[CRM Settings] Error fetching catalogue overview:', err?.message);
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch product catalogue' });
  }
});

crmSettingsRouter.patch('/catalogue/:id/ai-review', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await ProductModel.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { aiStatus, knowledgeVersion, priceVersion, owner, reviewNote } = req.body || {};
    const validStatus = aiStatus === 'Approved' || aiStatus === 'Awaiting review' || aiStatus === 'Excluded' ? aiStatus : 'Approved';

    const existingDoc = await CrmRecord.findOne({ key: 'catalogue.aiMetadata' }).lean<any>();
    const currentMap: Record<string, any> =
      existingDoc && !Array.isArray(existingDoc) && existingDoc.data && typeof existingDoc.data === 'object'
        ? { ...existingDoc.data }
        : {};

    const prev = currentMap[productId] || {};
    currentMap[productId] = {
      ...prev,
      aiStatus: validStatus,
      knowledgeVersion: knowledgeVersion || prev.knowledgeVersion || 'KB-001 / v1',
      priceVersion: priceVersion || prev.priceVersion || 'V2026.11',
      owner: owner || prev.owner || 'Catalogue Admin',
      reviewNote: reviewNote !== undefined ? String(reviewNote) : (prev.reviewNote || ''),
      updatedAt: new Date().toISOString(),
    };

    await CrmRecord.findOneAndUpdate(
      { key: 'catalogue.aiMetadata' },
      { $set: { data: currentMap } },
      { upsert: true, new: true }
    );

    return successResponse(res, { id: productId, ...currentMap[productId] }, 'Product AI review updated');
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update product AI review' });
  }
});

crmSettingsRouter.post('/catalogue/products', async (req, res) => {
  try {
    const { title, code, price, discountPrice, gstRate, hsnCode, stock, categoryId, shortDescription, description } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Product title is required.' });
    }

    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId) {
      const firstCat = await CategoryModel.findOne({ isDeleted: { $ne: true } }).lean<any>();
      if (!firstCat) {
        const createdCat = await CategoryModel.create({ name: 'Equipment', slug: 'equipment', isActive: true });
        resolvedCategoryId = createdCat._id;
      } else {
        resolvedCategoryId = firstCat._id;
      }
    }

    const baseSlug = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const created = await ProductModel.create({
      title: String(title).trim(),
      slug: uniqueSlug,
      code: code ? String(code).trim() : undefined,
      price: Number(price || 0),
      discountPrice: discountPrice !== undefined && discountPrice !== '' ? Number(discountPrice) : undefined,
      gstRate: Number(gstRate ?? 18),
      hsnCode: hsnCode ? String(hsnCode).trim() : undefined,
      stock: Number(stock ?? 0),
      category: resolvedCategoryId,
      shortDescription: shortDescription ? String(shortDescription).trim() : undefined,
      description: description ? String(description).trim() : String(shortDescription || title).trim(),
      isActive: true,
    });

    return successResponse(
      res,
      {
        id: created._id.toString(),
        title: created.title,
        code: created.code || '',
        price: created.price,
      },
      'Product added to catalogue',
      201
    );
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to create product' });
  }
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
