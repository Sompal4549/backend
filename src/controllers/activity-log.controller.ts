import { Request, Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ActivityLogModel } from '../models/activity-log.model';

export const listActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
  const { action, entity, entityId, leadId, user, search, role } = req.query;

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (entityId) filter.entityId = String(entityId);
  if (user) filter.userName = user;
  if (role === 'admin') filter.userRole = { $in: ['admin', 'superadmin'] };
  if (role === 'customer') filter.userRole = { $in: ['user', 'guest'] };
  if (search) {
    const regex = new RegExp(String(search), 'i');
    filter.$or = [{ title: regex }, { userName: regex }, { entity: regex }];
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
      // If search $or already exists, wrap both in $and
      filter.$and = [{ $or: filter.$or }, leadIdFilter];
      delete filter.$or;
    } else {
      Object.assign(filter, leadIdFilter);
    }
  }

  const [total, logs, entities] = await Promise.all([
    ActivityLogModel.countDocuments(filter),
    ActivityLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ActivityLogModel.distinct('entity'),
  ]);

  successResponse(res, {
    logs,
    total,
    page,
    limit,
    entities: entities.sort(),
  });
});