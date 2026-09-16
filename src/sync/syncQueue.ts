import { getDb } from "@/db/database";
import type {
  SyncAction,
  SyncConflictRow,
  SyncEntity,
  SyncQueueItem,
} from "@/db/schema";

export async function enqueueSyncOp(input: {
  opId?: string;
  entity: SyncEntity;
  entityId: string;
  action: SyncAction;
  payload: Record<string, unknown>;
}): Promise<SyncQueueItem> {
  const db = getDb();
  const opId = input.opId ?? crypto.randomUUID();

  // Dedupe: same opId already queued → skip insert
  const existing = await db.syncQueue.where("opId").equals(opId).first();
  if (existing && existing.status !== "done") {
    return existing;
  }

  const item: SyncQueueItem = {
    opId,
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    payload: input.payload,
    createdAt: Date.now(),
    retryCount: 0,
    status: "pending",
  };
  const localId = await db.syncQueue.add(item);
  return { ...item, localId };
}

export async function listPendingOps(): Promise<SyncQueueItem[]> {
  const db = getDb();
  const rows = await db.syncQueue
    .where("status")
    .anyOf(["pending", "failed"])
    .sortBy("createdAt");
  return rows;
}

export async function countPendingOps(): Promise<number> {
  const db = getDb();
  return db.syncQueue.where("status").anyOf(["pending", "failed", "syncing"]).count();
}

export async function markSyncing(localId: number): Promise<void> {
  await getDb().syncQueue.update(localId, { status: "syncing" });
}

export async function markDone(localId: number): Promise<void> {
  await getDb().syncQueue.delete(localId);
}

export async function markFailed(
  localId: number,
  retryCount: number,
  lastError: string,
  status: "failed" | "conflict" = "failed",
): Promise<void> {
  await getDb().syncQueue.update(localId, {
    status,
    retryCount,
    lastError,
  });
}

export async function hasPendingForEntity(
  entity: SyncEntity,
  entityId: string,
): Promise<boolean> {
  const count = await getDb()
    .syncQueue.where("entityId")
    .equals(entityId)
    .and(
      (row) =>
        row.entity === entity &&
        (row.status === "pending" ||
          row.status === "failed" ||
          row.status === "syncing"),
    )
    .count();
  return count > 0;
}

/** Active ops for monitor UI: pending, syncing, failed, conflict. */
export async function listAllActiveOps(): Promise<SyncQueueItem[]> {
  const db = getDb();
  const rows = await db.syncQueue
    .where("status")
    .anyOf(["pending", "syncing", "failed", "conflict"])
    .sortBy("createdAt");
  return rows;
}

/** Reset failed (and queue-status conflict) ops back to pending for retry. */
export async function retryAllFailed(): Promise<number> {
  const db = getDb();
  const rows = await db.syncQueue
    .where("status")
    .anyOf(["failed", "conflict"])
    .toArray();
  let count = 0;
  for (const row of rows) {
    if (row.localId == null) continue;
    await db.syncQueue.update(row.localId, {
      status: "pending",
      retryCount: 0,
      lastError: undefined,
    });
    count += 1;
  }
  return count;
}

export async function listUnresolvedConflicts(): Promise<SyncConflictRow[]> {
  const db = getDb();
  return db.syncConflicts.where("resolved").equals(0).sortBy("createdAt");
}

export async function markConflictResolved(id: string): Promise<void> {
  await getDb().syncConflicts.update(id, { resolved: 1 });
}
