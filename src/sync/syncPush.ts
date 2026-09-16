import { getDb } from "@/db/database";
import type { SyncQueueItem } from "@/db/schema";
import {
  listPendingOps,
  markDone,
  markFailed,
  markSyncing,
} from "@/sync/syncQueue";
import type { SyncTransport } from "@/sync/transports/types";

const MAX_RETRIES = 8;

async function remapLoanCreate(
  localLoanId: string,
  serverLoanId: string,
): Promise<void> {
  if (localLoanId === serverLoanId) return;
  const db = getDb();
  const localLoan = await db.loans.get(localLoanId);
  if (!localLoan) return;

  await db.transaction(
    "rw",
    db.loans,
    db.loanTransactions,
    db.interestSchedules,
    db.syncQueue,
    async () => {
      await db.loans.delete(localLoanId);
      await db.loans.put({
        ...localLoan,
        id: serverLoanId,
        updatedAt: new Date().toISOString(),
      });

      const txs = await db.loanTransactions
        .where("loanId")
        .equals(localLoanId)
        .toArray();
      for (const tx of txs) {
        await db.loanTransactions.delete(tx.id);
        await db.loanTransactions.put({ ...tx, loanId: serverLoanId });
      }

      const schedules = await db.interestSchedules
        .where("loanId")
        .equals(localLoanId)
        .toArray();
      for (const s of schedules) {
        await db.interestSchedules.delete(s.id);
        await db.interestSchedules.put({ ...s, loanId: serverLoanId });
      }

      // Drop local side-effect queue rows for this loan create (server already wrote them)
      const sideEffects = await db.syncQueue
        .where("entityId")
        .equals(localLoanId)
        .toArray();
      for (const row of sideEffects) {
        if (
          row.entity === "loanTransaction" ||
          row.entity === "interestSchedule"
        ) {
          if (row.localId != null) await db.syncQueue.delete(row.localId);
        }
      }
    },
  );
}

async function remapSimpleEntity(
  entity: SyncQueueItem["entity"],
  localId: string,
  serverId: string,
): Promise<void> {
  if (localId === serverId) return;
  const db = getDb();
  if (entity === "borrower") {
    const row = await db.borrowers.get(localId);
    if (!row) return;
    await db.transaction("rw", db.borrowers, db.loans, async () => {
      await db.borrowers.delete(localId);
      await db.borrowers.put({ ...row, id: serverId });
      const loans = await db.loans.where("borrowerId").equals(localId).toArray();
      for (const loan of loans) {
        await db.loans.put({ ...loan, borrowerId: serverId });
      }
    });
    return;
  }
  if (entity === "financeTransaction") {
    const row = await db.financeTransactions.get(localId);
    if (!row) return;
    await db.financeTransactions.delete(localId);
    await db.financeTransactions.put({ ...row, id: serverId });
    return;
  }
  if (entity === "manualAsset") {
    const row = await db.manualAssets.get(localId);
    if (!row) return;
    await db.manualAssets.delete(localId);
    await db.manualAssets.put({ ...row, id: serverId });
    return;
  }
  if (entity === "goldPurchase") {
    const row = await db.goldPurchases.get(localId);
    if (!row) return;
    await db.goldPurchases.delete(localId);
    await db.goldPurchases.put({ ...row, id: serverId });
  }
}

export async function syncPush(transport: SyncTransport): Promise<{
  pushed: number;
  failed: number;
}> {
  const pending = await listPendingOps();
  let pushed = 0;
  let failed = 0;

  for (const item of pending) {
    if (item.localId == null) continue;
    // Skip pure local side-effect markers for loan create
    if (
      (item.entity === "loanTransaction" ||
        item.entity === "interestSchedule") &&
      item.action === "create"
    ) {
      await markDone(item.localId);
      continue;
    }

    await markSyncing(item.localId);
    const result = await transport.pushOne(item);

    if (result.ok) {
      if (
        item.action === "create" &&
        result.serverRecord?.id &&
        result.serverRecord.id !== item.entityId
      ) {
        if (item.entity === "loan") {
          await remapLoanCreate(item.entityId, result.serverRecord.id);
        } else {
          await remapSimpleEntity(
            item.entity,
            item.entityId,
            result.serverRecord.id,
          );
        }
      }
      await markDone(item.localId);
      pushed += 1;
      continue;
    }

    if (result.conflict) {
      await markFailed(
        item.localId,
        item.retryCount,
        result.error ?? "Conflict",
        "conflict",
      );
      failed += 1;
      continue;
    }

    const nextRetry = item.retryCount + 1;
    if (!result.retryable || nextRetry >= MAX_RETRIES) {
      await markFailed(
        item.localId,
        nextRetry,
        result.error ?? "Failed",
        "failed",
      );
      failed += 1;
      continue;
    }

    await markFailed(item.localId, nextRetry, result.error ?? "Failed", "failed");
    failed += 1;
  }

  return { pushed, failed };
}
