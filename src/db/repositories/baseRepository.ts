import { getDb } from "@/db/database";
import type { SyncAction, SyncEntity } from "@/db/schema";
import { enqueueSyncOp } from "@/sync/syncQueue";
import { requestSync } from "@/sync/syncManager";

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function enqueueAndKick(
  input: {
    opId?: string;
    entity: SyncEntity;
    entityId: string;
    action: SyncAction;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await enqueueSyncOp(input);
  requestSync();
}

export function isActiveRecord<T extends { deletedAt?: string | null }>(
  row: T,
): boolean {
  return !row.deletedAt;
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await getDb().syncMetadata.get(key);
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await getDb().syncMetadata.put({ key, value });
}
