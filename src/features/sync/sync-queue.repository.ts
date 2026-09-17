import type { SyncConflictRow, SyncQueueItem } from "@/db/schema";
import { isDbOpen } from "@/db/database";
import {
  clearFailedOps,
  listAllActiveOps,
  listUnresolvedConflicts,
  markConflictResolved,
  removeQueueOp,
  retryAllFailed,
} from "@/sync/syncQueue";
import { runSync } from "@/sync/syncManager";

export const syncQueueRepository = {
  async listActive(): Promise<SyncQueueItem[]> {
    if (!isDbOpen()) return [];
    return listAllActiveOps();
  },

  async listConflicts(): Promise<SyncConflictRow[]> {
    if (!isDbOpen()) return [];
    return listUnresolvedConflicts();
  },

  async retryFailedAndSync(): Promise<number> {
    if (!isDbOpen()) return 0;
    const n = await retryAllFailed();
    await runSync({ pullScope: "allAccessible" });
    return n;
  },

  async syncNow(): Promise<void> {
    if (!isDbOpen()) return;
    await runSync({ pullScope: "allAccessible" });
  },

  async markConflictSeen(id: string): Promise<void> {
    if (!isDbOpen()) return;
    await markConflictResolved(id);
  },

  async removeError(localId: number): Promise<void> {
    if (!isDbOpen()) return;
    await removeQueueOp(localId);
  },

  async clearErrors(): Promise<number> {
    if (!isDbOpen()) return 0;
    return clearFailedOps();
  },
};

export const SYNC_ENTITY_LABELS: Record<SyncQueueItem["entity"], string> = {
  borrower: "Người vay",
  loan: "Khoản vay",
  loanTransaction: "GD khoản vay",
  interestSchedule: "Lịch thu",
  financeTransaction: "Thu chi",
  manualAsset: "Tài sản",
  goldPurchase: "Mua vàng",
  goldPlan: "Kế hoạch vàng",
  assetSettings: "Cài đặt tài sản",
  loanPayment: "Thu tiền",
};

export const SYNC_ACTION_LABELS: Record<SyncQueueItem["action"], string> = {
  create: "Tạo",
  update: "Sửa",
  delete: "Xóa",
};

export function shortId(id: string, len = 8): string {
  if (id.length <= len) return id;
  return `${id.slice(0, len)}…`;
}
