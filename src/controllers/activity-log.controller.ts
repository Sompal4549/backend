import { Request, Response } from 'express';
import { successResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { ActivityLogModel } from '../models/activity-log.model';

export const listActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
  const { action, entity, user, search } = req.query;

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (user) filter.userName = user;
  if (search) {
    const regex = new RegExp(String(search), 'i');
    filter.$or = [{ title: regex }, { userName: regex }, { entity: regex }];
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