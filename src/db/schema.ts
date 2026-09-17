import type { Borrower } from "@/types/borrower";
import type { Loan } from "@/types/loan";
import type { Transaction } from "@/types/transaction";
import type { InterestSchedule } from "@/types/interest-schedule";
import type { FinanceTransaction } from "@/types/finance";
import type {
  AssetSettings,
  GoldPlan,
  GoldPurchase,
  ManualAsset,
} from "@/types/assets";

/** Local-only soft-delete marker (server still hard-deletes today). */
export type WithLocalMeta<T> = T & {
  deletedAt?: string | null;
};

export type LocalBorrower = WithLocalMeta<Borrower>;
export type LocalLoan = WithLocalMeta<Loan>;
export type LocalLoanTransaction = WithLocalMeta<Transaction>;
export type LocalInterestSchedule = WithLocalMeta<InterestSchedule>;
export type LocalFinanceTransaction = WithLocalMeta<FinanceTransaction>;
export type LocalManualAsset = WithLocalMeta<ManualAsset>;
export type LocalGoldPurchase = WithLocalMeta<GoldPurchase>;
export type LocalGoldPlan = WithLocalMeta<GoldPlan>;
export type LocalAssetSettings = WithLocalMeta<AssetSettings>;

export type SyncEntity =
  | "borrower"
  | "loan"
  | "loanTransaction"
  | "interestSchedule"
  | "financeTransaction"
  | "manualAsset"
  | "goldPurchase"
  | "goldPlan"
  | "assetSettings"
  | "loanPayment";

export type SyncAction = "create" | "update" | "delete";

export type SyncQueueStatus =
  | "pending"
  | "syncing"
  | "failed"
  | "conflict"
  | "done";

export interface SyncQueueItem {
  localId?: number;
  /** Stable idempotency key for this mutation (UUID). */
  opId: string;
  entity: SyncEntity;
  entityId: string;
  action: SyncAction;
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  status: SyncQueueStatus;
  lastError?: string;
  /** For loanPayment: loanId lives in payload; entityId is payment op id. */
}

export interface SyncMetadataRow {
  key: string;
  value: string;
}

export interface SyncConflictRow {
  id: string;
  entity: SyncEntity;
  entityId: string;
  localUpdatedAt?: string;
  serverUpdatedAt?: string;
  createdAt: number;
  resolved: number; // 0 | 1 for Dexie index friendliness
}

export const SYNC_META_KEYS = {
  lastSyncAt: "lastSyncAt",
  initialSyncDone: "initialSyncDone",
  /** JSON array of SyncDataModule codes the user has opened (lazy pull). */
  activatedModules: "activatedModules",
} as const;

export function sanitizeUsername(username: string): string {
  return username.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "user";
}

export function dbNameForUser(username: string): string {
  return `monely_${sanitizeUsername(username)}`;
}
