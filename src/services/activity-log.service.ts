import { Types } from 'mongoose';
import { ActivityLogModel, ActivityAction } from '../models/activity-log.model';
import { getActivityContext } from '../utils/activity-context';

const PUBLIC_ENTITIES = new Set(['Enquiry', 'Subscriber', 'User', 'Order', 'Application']);

interface ActivityEntry {
  action: ActivityAction;
  entity: string;
  entityId?: string;
  title?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  snapshotBefore?: Record<string, unknown>;
  snapshotAfter?: Record<string, unknown>;
}

const computeChanges = (
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { before: unknown; after: unknown }> => {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(after)) {
    if (key === '_id' || key === 'createdAt' || key === 'updatedAt' || key === '__v') continue;
    const beforeRaw = JSON.stringify(before?.[key] ?? undefined);
    const afterRaw = JSON.stringify(after[key]);
    if (beforeRaw !== afterRaw) {
      changes[key] = { before: before?.[key] ?? null, after: after[key] };
    }
  }
  return changes;
};

export const recordActivity = async (entry: ActivityEntry): Promise<void> => {
  const ctx = getActivityContext();

  if (ctx?.userId) {
    // Any authenticated user (admin or customer) action is logged.
    if (!ctx.userRole) return;
  } else {
    // Anonymous/public actions are logged only for customer-facing entities.
    if (!PUBLIC_ENTITIES.has(entry.entity)) return;
  }

  const snapshot = entry.snapshotAfter ?? entry.snapshotBefore ?? {};
  const fallbackName =
    (typeof snapshot.name === 'string' && snapshot.name) ||
    (typeof snapshot.fullName === 'string' && snapshot.fullName) ||
    (typeof snapshot.email === 'string' && snapshot.email) ||
    (typeof snapshot.phone === 'string' && snapshot.phone) ||
    'Guest';

  try {
    await ActivityLogModel.collection.insertOne({
      ...entry,
      userId: ctx?.userId ? new Types.ObjectId(ctx.userId) : undefined,
      userName: ctx?.userName || fallbackName,
      userRole: ctx?.userRole || 'guest',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to record activity log:', error);
  }
};

export const logCreate = (
  entity: string,
  entityId: string | undefined,
  title: string | undefined,
  snapshotAfter: Record<string, unknown>
) => recordActivity({ action: 'create', entity, entityId, title, snapshotAfter });

export const logUpdate = (
  entity: string,
  entityId: string | undefined,
  title: string | undefined,
  snapshotBefore: Record<string, unknown>,
  snapshotAfter: Record<string, unknown>
) =>
  recordActivity({
    action: 'update',
    entity,
    entityId,
    title,
    snapshotBefore,
    snapshotAfter,
    changes: computeChanges(snapshotBefore, snapshotAfter),
  });

export const logDelete = (
  entity: string,
  entityId: string | undefined,
  title: string | undefined,
  snapshot: Record<string, unknown>
) => recordActivity({ action: 'delete', entity, entityId, title, snapshotAfter: snapshot });