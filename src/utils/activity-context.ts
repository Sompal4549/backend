import { AsyncLocalStorage } from 'async_hooks';

export interface ActivityContext {
  userId?: string;
  userName?: string;
  userRole?: string;
}

export const activityContextStore = new AsyncLocalStorage<ActivityContext>();

export const getActivityContext = (): ActivityContext | undefined => activityContextStore.getStore();

export const runWithActivityContext = <T>(ctx: ActivityContext, fn: () => T): T =>
  activityContextStore.run(ctx, fn);
