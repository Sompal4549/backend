import { AsyncLocalStorage } from "async_hooks";

export interface RecordedChange {
  entity: string;
  entityId?: string;
  operation: "created" | "updated" | "deleted";
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

interface RequestContext {
  changes: RecordedChange[];
}

export const activityContext = new AsyncLocalStorage<RequestContext>();
