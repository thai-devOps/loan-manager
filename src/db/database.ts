import Dexie, { type EntityTable } from "dexie";
import {
  dbNameForUser,
  type LocalAssetSettings,
  type LocalBorrower,
  type LocalFinanceTransaction,
  type LocalGoldPlan,
  type LocalGoldPurchase,
  type LocalInterestSchedule,
  type LocalLoan,
  type LocalLoanTransaction,
  type LocalManualAsset,
  type SyncConflictRow,
  type SyncMetadataRow,
  type SyncQueueItem,
} from "@/db/schema";

export class MonelyDatabase extends Dexie {
  borrowers!: EntityTable<LocalBorrower, "id">;
  loans!: EntityTable<LocalLoan, "id">;
  loanTransactions!: EntityTable<LocalLoanTransaction, "id">;
  interestSchedules!: EntityTable<LocalInterestSchedule, "id">;
  financeTransactions!: EntityTable<LocalFinanceTransaction, "id">;
  manualAssets!: EntityTable<LocalManualAsset, "id">;
  goldPurchases!: EntityTable<LocalGoldPurchase, "id">;
  goldPlans!: EntityTable<LocalGoldPlan, "id">;
  assetSettings!: EntityTable<LocalAssetSettings, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "localId">;
  syncMetadata!: EntityTable<SyncMetadataRow, "key">;
  syncConflicts!: EntityTable<SyncConflictRow, "id">;

  constructor(username: string) {
    super(dbNameForUser(username));

    this.version(1).stores({
      borrowers: "id, name, updatedAt, deletedAt",
      loans: "id, borrowerId, status, updatedAt, deletedAt",
      loanTransactions: "id, loanId, transactionDate, createdAt, deletedAt",
      interestSchedules: "id, loanId, dueDate, status, deletedAt",
      financeTransactions: "id, type, date, updatedAt, deletedAt",
      manualAssets: "id, type, updatedAt, deletedAt",
      goldPurchases: "id, purchaseDate, type, updatedAt, deletedAt",
      goldPlans: "id, updatedAt, deletedAt",
      assetSettings: "id, updatedAt",
      syncQueue: "++localId, opId, entity, entityId, action, status, createdAt",
      syncMetadata: "key",
      syncConflicts: "id, entity, entityId, resolved, createdAt",
    });
  }
}

let currentDb: MonelyDatabase | null = null;
let currentUsername: string | null = null;

export function getDb(): MonelyDatabase {
  if (!currentDb) {
    throw new Error("Local database is not open. User must be authenticated.");
  }
  return currentDb;
}

export function isDbOpen(): boolean {
  return currentDb !== null;
}

export function getCurrentDbUsername(): string | null {
  return currentUsername;
}

/** Open (or switch) the per-user IndexedDB. Does not wipe previous users' data. */
export async function openUserDatabase(username: string): Promise<MonelyDatabase> {
  if (currentDb && currentUsername === username) {
    return currentDb;
  }
  if (currentDb) {
    currentDb.close();
    currentDb = null;
    currentUsername = null;
  }
  const db = new MonelyDatabase(username);
  await db.open();
  currentDb = db;
  currentUsername = username;
  return db;
}

/** Close connection only — keeps IndexedDB data (logout policy 2A). */
export function closeUserDatabase(): void {
  if (currentDb) {
    currentDb.close();
    currentDb = null;
    currentUsername = null;
  }
}
