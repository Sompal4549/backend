import { Request, Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ActivityLogModel } from '../models/activity-log.model';

const str = (val: unknown) => (typeof val === 'string' ? val.trim() : '');
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dayStart = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatActionName = (action: string) => {
  const lower = action.toLowerCase();
  if (lower === 'create' || lower === 'created') return 'Created';
  if (lower === 'update' || lower === 'updated') return 'Updated';
  if (lower === 'delete' || lower === 'deleted') return 'Deleted';
  if (lower === 'login') return 'Login';
  if (lower === 'logout') return 'Logout';
  return action.charAt(0).toUpperCase() + action.slice(1);
};

export const listActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(5000, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
  const { action, entity, entityId, leadId, user, search, q, role, module, status, from, to } = req.query;

  const filter: Record<string, unknown> = {};

  const actionStr = str(action);
  if (actionStr) {
    const actLower = actionStr.toLowerCase();
    if (actLower === 'created' || actLower === 'create') {
      filter.action = { $in: ['create', 'Created'] };
    } else if (actLower === 'updated' || actLower === 'update') {
      filter.action = { $in: ['update', 'Updated'] };
    } else if (actLower === 'deleted' || actLower === 'delete') {
      filter.action = { $in: ['delete', 'Deleted'] };
    } else {
      filter.action = new RegExp(`^${escapeRegex(actionStr)}$`, 'i');
    }
  }

  const moduleStr = str(module) || str(entity);
  if (moduleStr) {
    const modRegex = new RegExp(`^${escapeRegex(moduleStr)}$`, 'i');
    filter.$or = [{ entity: modRegex }, { adminModule: modRegex }];
  }

  if (entityId) filter.entityId = String(entityId);
  if (user) filter.userName = str(user);
  if (role === 'admin') filter.userRole = { $in: ['admin', 'superadmin'] };
  if (role === 'customer') filter.userRole = { $in: ['user', 'guest'] };
  if (status === 'Success' || status === 'Failed') filter.status = status;

  const fromDate = dayStart(str(from));
  const toDate = dayStart(str(to));
  if (fromDate || toDate) {
    const range: Record<string, Date> = {};
    if (fromDate) range.$gte = fromDate;
    if (toDate) range.$lt = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
    filter.createdAt = range;
  }

  const searchQuery = str(q) || str(search);
  if (searchQuery) {
    const re = new RegExp(escapeRegex(searchQuery), 'i');
    const searchConditions = [
      { title: re },
      { details: re },
      { userName: re },
      { userEmail: re },
      { entity: re },
      { adminModule: re },
      { adminPage: re },
      { url: re },
      { ip: re },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  // leadId filter: match old logs (entity=Lead, entityId=leadId) OR new logs (leadId=leadId)
  if (leadId) {
    const leadIdFilter = {
      $or: [
        { entity: 'Lead', entityId: String(leadId) },
        { leadId: leadId },
      ],
    };
    if (filter.$or) {
      filter.$and = (filter.$and as any[] || []).concat([{ $or: filter.$or }, leadIdFilter]);
      delete filter.$or;
    } else if (filter.$and) {
      (filter.$and as any[]).push(leadIdFilter);
    } else {
      Object.assign(filter, leadIdFilter);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, rawLogs, users, entities, todayCount, createdCount, updatedCount, deletedCount, loginCount, failedCount] =
    await Promise.all([
      ActivityLogModel.countDocuments(filter),
      ActivityLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLogModel.distinct('userName'),
      ActivityLogModel.distinct('entity'),
      ActivityLogModel.countDocuments({ createdAt: { $gte: today } }),
      ActivityLogModel.countDocuments({ action: { $in: ['create', 'Created'] } }),
      ActivityLogModel.countDocuments({ action: { $in: ['update', 'Updated'] } }),
      ActivityLogModel.countDocuments({ action: { $in: ['delete', 'Deleted'] } }),
      ActivityLogModel.countDocuments({ action: { $in: ['login', 'Login'] } }),
      ActivityLogModel.countDocuments({ status: 'Failed' }),
    ]);

  const allLogsTotal = await ActivityLogModel.estimatedDocumentCount();

  const mappedItems = (rawLogs as any[]).map((log) => {
    const actionFormatted = formatActionName(log.action || 'update');
    const entityName = log.adminModule || log.module || log.entity || 'General';
    const pageUrl = log.url || log.adminPage || (log.entity ? `/${String(log.entity).toLowerCase()}s` : '/admin');
    const method = log.method || (log.action === 'delete' ? 'DELETE' : log.action === 'create' ? 'POST' : 'PUT');
    const apiPath = log.apiPath || (log.entity ? `/api/v1/${String(log.entity).toLowerCase()}s` : '/api/v1');

    // Build changes array for ChangeDiff modal
    let changesArr: any[] = [];
    if (Array.isArray(log.changes)) {
      changesArr = log.changes;
    } else if (log.changes && typeof log.changes === 'object') {
      const beforeObj: Record<string, unknown> = {};
      const afterObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(log.changes as Record<string, any>)) {
        beforeObj[k] = v?.before;
        afterObj[k] = v?.after;
      }
      changesArr = [
        {
          entity: entityName,
          entityId: log.entityId ? String(log.entityId) : undefined,
          operation: actionFormatted === 'Created' ? 'created' : actionFormatted === 'Deleted' ? 'deleted' : 'updated',
          before: beforeObj,
          after: afterObj,
        },
      ];
    } else if (log.snapshotBefore || log.snapshotAfter) {
      changesArr = [
        {
          entity: entityName,
          entityId: log.entityId ? String(log.entityId) : undefined,
          operation: actionFormatted === 'Created' ? 'created' : actionFormatted === 'Deleted' ? 'deleted' : 'updated',
          before: log.snapshotBefore || {},
          after: log.snapshotAfter || {},
        },
      ];
    }

    return {
      _id: String(log._id),
      userId: log.userId ? String(log.userId) : undefined,
      userName: log.userName || 'Ensis Administrator',
      userEmail: log.userEmail || (log.userName === 'Ensis Administrator' ? 'admin@ensis.in' : undefined),
      userRole: log.userRole || 'SUPER ADMIN',
      action: actionFormatted,
      module: entityName,
      url: pageUrl,
      method,
      apiPath,
      ip: log.ip || '127.0.0.1',
      userAgent: log.userAgent || '',
      status: log.status || 'Success',
      statusCode: log.statusCode || 200,
      details: log.details || log.title || `${actionFormatted} in ${entityName}`,
      entityId: log.entityId ? String(log.entityId) : undefined,
      durationMs: log.durationMs,
      changes: changesArr,
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString(),
      // Legacy backward-compat fields
      title: log.title || log.details,
      entity: entityName,
      snapshotBefore: log.snapshotBefore,
      snapshotAfter: log.snapshotAfter,
    };
  });

  const stats = {
    total: allLogsTotal,
    today: todayCount,
    created: createdCount,
    updated: updatedCount,
    deleted: deletedCount,
    logins: loginCount,
    failed: failedCount,
  };

  const sortedUsers = (users as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const sortedModules = (entities as string[]).filter(Boolean).sort((a, b) => a.localeCompare(b));

  successResponse(res, {
    items: mappedItems,
    logs: mappedItems, // backward compatibility for leads/[overview]
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    stats,
    filters: {
      users: sortedUsers,
      modules: sortedModules,
      actions: ['Created', 'Updated', 'Deleted', 'Login', 'Logout'],
    },
    entities: sortedModules,
  });
});