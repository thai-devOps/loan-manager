import { getDb } from "@/db/database";
import type { SyncEntity } from "@/db/schema";
import { SYNC_META_KEYS } from "@/db/schema";
import { hasPendingForEntity } from "@/sync/syncQueue";
import type { SyncTransport } from "@/sync/transports/types";

type AnyLocal = { id: string; updatedAt?: string; deletedAt?: string | null };

async function tableFor(entity: SyncEntity) {
  const db = getDb();
  switch (entity) {
    case "borrower":
      return db.borrowers;
    case "loan":
      return db.loans;
    case "loanTransaction":
      return db.loanTransactions;
    case "interestSchedule":
      return db.interestSchedules;
    case "financeTransaction":
      return db.financeTransactions;
    case "manualAsset":
      return db.manualAssets;
    case "goldPurchase":
      return db.goldPurchases;
    case "goldPlan":
      return db.goldPlans;
    case "assetSettings":
      return db.assetSettings;
    default:
      return null;
  }
}

async function recordConflict(
  entity: SyncEntity,
  entityId: string,
  localUpdatedAt?: string,
  serverUpdatedAt?: string,
): Promise<void> {
  await getDb().syncConflicts.put({
    id: crypto.randomUUID(),
    entity,
    entityId,
    localUpdatedAt,
    serverUpdatedAt,
    createdAt: Date.now(),
    resolved: 0,
  });
}

/**
 * Full-list pull + reconcile.
 * - Upserts server rows (clears deletedAt).
 * - Removes local rows missing on server ONLY when there is no pending local op.
 * - If local has pending changes and server updatedAt is newer → conflict, skip overwrite.
 */
export async function syncPull(transport: SyncTransport): Promise<void> {
  const bundles = await transport.pullAll();
  const db = getDb();

  for (const bundle of bundles) {
    if (bundle.entity === "loanPayment") continue;
    const table = await tableFor(bundle.entity);
    if (!table) continue;

    const serverIds = new Set(bundle.rows.map((r) => r.id));
    const localRows = (await table.toArray()) as AnyLocal[];

    for (const serverRow of bundle.rows) {
      const local = localRows.find((r) => r.id === serverRow.id);
      const pending = await hasPendingForEntity(bundle.entity, serverRow.id);
      const serverUpdatedAt =
        typeof (serverRow as { updatedAt?: unknown }).updatedAt === "string"
          ? String((serverRow as { updatedAt?: unknown }).updatedAt)
          : undefined;

      if (
        pending &&
        local &&
        serverUpdatedAt &&
        local.updatedAt &&
        serverUpdatedAt > local.updatedAt
      ) {
        await recordConflict(
          bundle.entity,
          serverRow.id,
          local.updatedAt,
          serverUpdatedAt,
        );
        continue;
      }

      if (pending) {
        continue;
      }

      await table.put({
        ...serverRow,
        deletedAt: null,
      } as never);
    }

    for (const local of localRows) {
      if (serverIds.has(local.id)) continue;
      const pending = await hasPendingForEntity(bundle.entity, local.id);
      if (pending) continue;
      await table.delete(local.id);
    }
  }

  await db.syncMetadata.put({
    key: SYNC_META_KEYS.lastSyncAt,
    value: new Date().toISOString(),
  });
  await db.syncMetadata.put({
    key: SYNC_META_KEYS.initialSyncDone,
    value: "1",
  });
}
