/**
 * Sync transport contracts.
 *
 * BACKEND GAPS (not implemented in client-first 1A):
 * - GET /api/sync/pull?cursor=
 * - POST /api/sync/push (batch ops + conflicts)
 * - Soft delete deletedAt + updatedAt indexes on Mongo
 * - updatedAt on transactions / interestSchedules
 * - Idempotency key for loan payments
 * - Prefer accepting client-provided UUID on create
 *
 * Interim: RestReplayTransport replays CRUD via existing endpoints
 * and reconciles with full list GETs. Do not treat this as complete
 * incremental sync.
 */

import type { SyncQueueItem } from "@/db/schema";

export interface PullEntityResult {
  entity: SyncQueueItem["entity"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Array<{ id: string; [key: string]: any }>;
}

export interface PushResult {
  ok: boolean;
  /** Server entity after create/update, if any (for id remap). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serverRecord?: { id: string; [key: string]: any };
  conflict?: boolean;
  error?: string;
  retryable?: boolean;
}

export interface PullAllOptions {
  /** When set, only pull entities belonging to these sync data modules. */
  modules?: string[];
}

export interface SyncTransport {
  pullAll(options?: PullAllOptions): Promise<PullEntityResult[]>;
  pushOne(item: SyncQueueItem): Promise<PushResult>;
}

export function asServerRecord(row: { id: string }): {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
} {
  return { ...row };
}
