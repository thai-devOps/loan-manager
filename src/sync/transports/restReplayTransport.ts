import {
  cancelLoan,
  createBorrower,
  createFinanceTransaction,
  createGoldPurchase,
  createLoan,
  createManualAsset,
  deleteFinanceTransaction,
  deleteGoldPurchase,
  deleteManualAsset,
  fetchBorrowers,
  fetchFinanceTransactions,
  fetchGoldPlan,
  fetchGoldPurchases,
  fetchLoans,
  fetchManualAssets,
  fetchAssetSettings,
  fetchSchedules,
  fetchTransactions,
  recordPayment,
  updateAssetSettings,
  updateBorrower,
  updateFinanceTransaction,
  updateGoldPurchase,
  updateManualAsset,
  upsertGoldPlan,
} from "@/api/endpoints";
import { ApiError } from "@/api/client";
import type { SyncQueueItem } from "@/db/schema";
import {
  entitiesForModules,
  isSyncDataModule,
  type SyncDataModule,
} from "@/sync/syncModules";
import type {
  PullAllOptions,
  PullEntityResult,
  PushResult,
  SyncTransport,
} from "@/sync/transports/types";
import { asServerRecord } from "@/sync/transports/types";
import type { BorrowerFormValues } from "@/schemas/borrower.schema";
import type { LoanFormValues } from "@/schemas/loan.schema";

function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500 || error.status === 408;
  }
  if (error instanceof TypeError) return true; // network
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("offline") ||
      msg.includes("failed to fetch")
    );
  }
  return true;
}

/** 401/403: skip entity — do not wipe local Dexie rows or fail the whole pull. */
function isForbiddenPull(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 || error.status === 403)
  );
}

async function pullOptional<T>(
  entity: PullEntityResult["entity"],
  fetcher: () => Promise<T>,
  toRows: (data: T) => PullEntityResult["rows"],
): Promise<PullEntityResult | null> {
  try {
    const data = await fetcher();
    return { entity, rows: toRows(data) };
  } catch (error) {
    if (isForbiddenPull(error)) return null;
    throw error;
  }
}

function asFormBorrower(payload: Record<string, unknown>): BorrowerFormValues {
  return {
    name: String(payload.name ?? ""),
    phone: payload.phone ? String(payload.phone) : undefined,
    identityNumber: payload.identityNumber
      ? String(payload.identityNumber)
      : undefined,
    address: payload.address ? String(payload.address) : undefined,
    note: payload.note ? String(payload.note) : undefined,
  };
}

function asFormLoan(payload: Record<string, unknown>): LoanFormValues {
  return {
    borrowerId: String(payload.borrowerId ?? ""),
    principalAmount: Number(payload.principalAmount ?? 0),
    monthlyInterestAmount: Number(payload.monthlyInterestAmount ?? 0),
    startDate: String(payload.startDate ?? ""),
    note: payload.note ? String(payload.note) : undefined,
  };
}

export const restReplayTransport: SyncTransport = {
  async pullAll(options?: PullAllOptions): Promise<PullEntityResult[]> {
    // Fetch independently so one module's 403 (RBAC) does not abort the whole sync
    // and trigger infinite backoff while the offline queue stays empty.
    const modules = (options?.modules ?? []).filter(
      isSyncDataModule,
    ) as SyncDataModule[];
    if (modules.length === 0) return [];

    const allowed = new Set(entitiesForModules(modules));
    const jobs: Array<Promise<PullEntityResult | null>> = [];

    const enqueue = (
      entity: PullEntityResult["entity"],
      run: () => Promise<PullEntityResult | null>,
    ) => {
      if (!allowed.has(entity)) return;
      jobs.push(run());
    };

    enqueue("borrower", () =>
      pullOptional("borrower", fetchBorrowers, (rows) => rows),
    );
    enqueue("loan", () => pullOptional("loan", fetchLoans, (rows) => rows));
    enqueue("loanTransaction", () =>
      pullOptional("loanTransaction", fetchTransactions, (rows) => rows),
    );
    enqueue("interestSchedule", () =>
      pullOptional("interestSchedule", fetchSchedules, (rows) => rows),
    );
    enqueue("financeTransaction", () =>
      pullOptional("financeTransaction", fetchFinanceTransactions, (rows) => rows),
    );
    enqueue("manualAsset", () =>
      pullOptional("manualAsset", fetchManualAssets, (rows) => rows),
    );
    enqueue("goldPurchase", () =>
      pullOptional("goldPurchase", fetchGoldPurchases, (rows) => rows),
    );
    enqueue("goldPlan", () =>
      pullOptional("goldPlan", fetchGoldPlan, (plan) => (plan ? [plan] : [])),
    );
    enqueue("assetSettings", () =>
      pullOptional("assetSettings", fetchAssetSettings, (settings) => [settings]),
    );

    const settled = await Promise.all(jobs);
    return settled.filter((r): r is PullEntityResult => r !== null);
  },

  async pushOne(item: SyncQueueItem): Promise<PushResult> {
    try {
      switch (item.entity) {
        case "borrower": {
          if (item.action === "create") {
            const created = await createBorrower(asFormBorrower(item.payload));
            return { ok: true, serverRecord: asServerRecord(created) };
          }
          if (item.action === "update") {
            const updated = await updateBorrower(
              item.entityId,
              asFormBorrower(item.payload),
            );
            return { ok: true, serverRecord: asServerRecord(updated) };
          }
          return { ok: false, error: "Borrower delete not supported", retryable: false };
        }
        case "loan": {
          if (item.action === "create") {
            // Server creates loan + disbursement + schedules in one POST.
            const created = await createLoan(asFormLoan(item.payload));
            return { ok: true, serverRecord: asServerRecord(created) };
          }
          if (item.action === "update") {
            if (item.payload.status === "CANCELLED") {
              const updated = await cancelLoan(item.entityId);
              return { ok: true, serverRecord: asServerRecord(updated) };
            }
            return {
              ok: false,
              error: "Unsupported loan update",
              retryable: false,
            };
          }
          return { ok: false, error: "Loan delete not supported", retryable: false };
        }
        case "loanPayment": {
          if (item.action !== "create") {
            return { ok: false, error: "Invalid payment action", retryable: false };
          }
          const loanId = String(item.payload.loanId ?? "");
          await recordPayment(loanId, {
            paymentType: item.payload.paymentType as
              | "INTEREST_PAYMENT"
              | "PRINCIPAL_PAYMENT"
              | "BOTH",
            amount:
              item.payload.amount !== undefined
                ? Number(item.payload.amount)
                : undefined,
            interestAmount:
              item.payload.interestAmount !== undefined
                ? Number(item.payload.interestAmount)
                : undefined,
            principalAmount:
              item.payload.principalAmount !== undefined
                ? Number(item.payload.principalAmount)
                : undefined,
            transactionDate: String(item.payload.transactionDate ?? ""),
            note: item.payload.note
              ? String(item.payload.note)
              : undefined,
          });
          return { ok: true };
        }
        case "loanTransaction":
        case "interestSchedule": {
          // Side effects of loan create / payment — do not POST separately.
          return { ok: true };
        }
        case "financeTransaction": {
          if (item.action === "create") {
            const created = await createFinanceTransaction({
              type: item.payload.type as "income" | "expense",
              category: String(item.payload.category ?? ""),
              amount: Number(item.payload.amount ?? 0),
              date: String(item.payload.date ?? ""),
              description: String(item.payload.description ?? ""),
              note: item.payload.note
                ? String(item.payload.note)
                : undefined,
              paymentMethod: item.payload.paymentMethod
                ? String(item.payload.paymentMethod)
                : undefined,
            });
            return { ok: true, serverRecord: asServerRecord(created) };
          }
          if (item.action === "update") {
            const updated = await updateFinanceTransaction(item.entityId, {
              type: item.payload.type as "income" | "expense",
              category: String(item.payload.category ?? ""),
              amount: Number(item.payload.amount ?? 0),
              date: String(item.payload.date ?? ""),
              description: String(item.payload.description ?? ""),
              note: item.payload.note
                ? String(item.payload.note)
                : undefined,
              paymentMethod: item.payload.paymentMethod
                ? String(item.payload.paymentMethod)
                : undefined,
            });
            return { ok: true, serverRecord: asServerRecord(updated) };
          }
          await deleteFinanceTransaction(item.entityId);
          return { ok: true };
        }
        case "manualAsset": {
          if (item.action === "create") {
            const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...body } =
              item.payload as Record<string, unknown> & {
                id?: string;
                createdAt?: string;
                updatedAt?: string;
                deletedAt?: string | null;
              };
            void _id;
            void _c;
            void _u;
            void _d;
            const created = await createManualAsset(
              body as Parameters<typeof createManualAsset>[0],
            );
            return { ok: true, serverRecord: asServerRecord(created) };
          }
          if (item.action === "update") {
            const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...body } =
              item.payload as Record<string, unknown> & {
                id?: string;
                createdAt?: string;
                updatedAt?: string;
                deletedAt?: string | null;
              };
            void _id;
            void _c;
            void _u;
            void _d;
            const updated = await updateManualAsset(
              item.entityId,
              body as Parameters<typeof updateManualAsset>[1],
            );
            return { ok: true, serverRecord: asServerRecord(updated) };
          }
          await deleteManualAsset(item.entityId);
          return { ok: true };
        }
        case "goldPurchase": {
          if (item.action === "create") {
            const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...body } =
              item.payload as Record<string, unknown> & {
                id?: string;
                createdAt?: string;
                updatedAt?: string;
                deletedAt?: string | null;
              };
            void _id;
            void _c;
            void _u;
            void _d;
            const created = await createGoldPurchase(
              body as Parameters<typeof createGoldPurchase>[0],
            );
            return { ok: true, serverRecord: asServerRecord(created) };
          }
          if (item.action === "update") {
            const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...body } =
              item.payload as Record<string, unknown> & {
                id?: string;
                createdAt?: string;
                updatedAt?: string;
                deletedAt?: string | null;
              };
            void _id;
            void _c;
            void _u;
            void _d;
            const updated = await updateGoldPurchase(
              item.entityId,
              body as Parameters<typeof updateGoldPurchase>[1],
            );
            return { ok: true, serverRecord: asServerRecord(updated) };
          }
          await deleteGoldPurchase(item.entityId);
          return { ok: true };
        }
        case "goldPlan": {
          const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...body } =
            item.payload as Record<string, unknown> & {
              id?: string;
              createdAt?: string;
              updatedAt?: string;
              deletedAt?: string | null;
            };
          void _id;
          void _c;
          void _u;
          void _d;
          const updated = await upsertGoldPlan(
            body as Parameters<typeof upsertGoldPlan>[0],
          );
          return { ok: true, serverRecord: asServerRecord(updated) };
        }
        case "assetSettings": {
          const updated = await updateAssetSettings({
            goldReferencePricePerChi: item.payload
              .goldReferencePricePerChi as Parameters<
              typeof updateAssetSettings
            >[0]["goldReferencePricePerChi"],
            allocationTargets: item.payload.allocationTargets as Parameters<
              typeof updateAssetSettings
            >[0]["allocationTargets"],
          });
          return { ok: true, serverRecord: asServerRecord(updated) };
        }
        default:
          return { ok: false, error: `Unknown entity`, retryable: false };
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Push failed",
        retryable: isRetryable(error),
        conflict: error instanceof ApiError && error.status === 409,
      };
    }
  },
};
