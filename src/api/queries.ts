import { useQuery } from "@tanstack/react-query";
import { fetchAssetSnapshots, fetchGoldPricesLatest, fetchGoldTypes, syncSchedules } from "@/api/endpoints";
import { queryKeys } from "@/api/query-keys";
import { assetRepository } from "@/db/repositories/assetRepository";
import { borrowerRepository } from "@/db/repositories/borrowerRepository";
import { financeRepository } from "@/db/repositories/financeRepository";
import { loanRepository } from "@/db/repositories/loanRepository";
import { isDbOpen } from "@/db/database";
import { useSyncStore } from "@/stores/sync.store";
import { resolveScheduleStatus } from "@/lib/calculations";

function useLocalDbReady(): boolean {
  return useSyncStore((s) => s.dbReady);
}

export function useBorrowersQuery() {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.borrowers.all,
    queryFn: () => borrowerRepository.list(),
    enabled: dbReady && isDbOpen(),
  });
}

export function useBorrowerQuery(id: string) {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.borrowers.detail(id),
    queryFn: async () => {
      const row = await borrowerRepository.get(id);
      if (!row) throw new Error("Không tìm thấy người vay");
      return row;
    },
    enabled: Boolean(id) && dbReady && isDbOpen(),
  });
}

export function useLoansQuery(status?: string) {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.loans.all(status),
    queryFn: () => loanRepository.list(status),
    enabled: dbReady && isDbOpen(),
  });
}

export function useLoanDetailQuery(id: string) {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.loans.detail(id),
    queryFn: async () => {
      const detail = await loanRepository.getDetail(id);
      if (!detail) throw new Error("Không tìm thấy khoản vay");
      return detail;
    },
    enabled: Boolean(id) && dbReady && isDbOpen(),
  });
}

export function useTransactionsQuery() {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.transactions.all,
    queryFn: () => loanRepository.listTransactions(),
    enabled: dbReady && isDbOpen(),
  });
}

export function useSchedulesQuery(status?: string) {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.schedules.all(status),
    queryFn: async () => {
      let rows = await loanRepository.listSchedules();
      rows = rows.map((s) => ({
        ...s,
        status: resolveScheduleStatus(s),
      }));
      if (status && status !== "ALL") {
        rows = rows.filter((s) => s.status === status);
      }

      // Server horizon extension — do not await; local list is source of truth
      scheduleHorizonSyncInBackground();

      return rows;
    },
    enabled: dbReady && isDbOpen(),
  });
}

/** At most once per 5 minutes so remounts don't spam POST /api/schedules. */
let lastScheduleHorizonSyncAt = 0;
function scheduleHorizonSyncInBackground(): void {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  const now = Date.now();
  if (now - lastScheduleHorizonSyncAt < 5 * 60_000) return;
  lastScheduleHorizonSyncAt = now;
  void syncSchedules().catch(() => undefined);
}

export function useStatsQuery() {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.stats.all,
    queryFn: async () => {
      const [borrowers, loans, transactions, schedules] = await Promise.all([
        borrowerRepository.list(),
        loanRepository.list(),
        loanRepository.listTransactions(),
        loanRepository.listSchedules(),
      ]);
      return {
        borrowers: borrowers.length,
        loans: loans.length,
        transactions: transactions.length,
        schedules: schedules.length,
      };
    },
    enabled: dbReady && isDbOpen(),
  });
}

export function useFinanceTransactionsQuery(params?: {
  month?: string;
  from?: string;
  to?: string;
}) {
  const dbReady = useLocalDbReady();
  const key = params?.month
    ? queryKeys.finance.month(params.month)
    : params?.from && params?.to
      ? queryKeys.finance.range(params.from, params.to)
      : queryKeys.finance.all;
  return useQuery({
    queryKey: key,
    queryFn: () => financeRepository.list(params),
    enabled: dbReady && isDbOpen(),
  });
}

export function useAssetSummaryQuery() {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.assets.summary,
    queryFn: () => assetRepository.getSummary(),
    enabled: dbReady && isDbOpen(),
  });
}

export function useAssetAllocationQuery() {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.assets.allocation,
    queryFn: () => assetRepository.getAllocation(),
    enabled: dbReady && isDbOpen(),
  });
}

export function useManualAssetsQuery() {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.assets.list,
    queryFn: () => assetRepository.listManual(),
    enabled: dbReady && isDbOpen(),
  });
}

export function useGoldPurchasesQuery() {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.assets.goldPurchases,
    queryFn: () => assetRepository.listGoldPurchases(),
    enabled: dbReady && isDbOpen(),
  });
}

export function useGoldPlanQuery() {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.assets.goldPlan,
    queryFn: () => assetRepository.getGoldPlan(),
    enabled: dbReady && isDbOpen(),
  });
}

export function useAssetSettingsQuery() {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.assets.settings,
    queryFn: () => assetRepository.getSettings(),
    enabled: dbReady && isDbOpen(),
  });
}

export function useAssetSnapshotsQuery(months = 12) {
  const dbReady = useLocalDbReady();
  return useQuery({
    queryKey: queryKeys.assets.snapshots(months),
    // Snapshots remain server-derived for now (not stored in Dexie)
    queryFn: () => fetchAssetSnapshots(months),
    enabled: dbReady,
  });
}

export function useGoldPricesLatestQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.assets.goldPricesLatest,
    queryFn: () => fetchGoldPricesLatest(),
    enabled,
    staleTime: 5 * 60_000,
    refetchInterval: 12 * 60_000,
    retry: 1,
  });
}

export function useGoldTypesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.assets.goldTypes,
    queryFn: () => fetchGoldTypes(),
    enabled,
    staleTime: 10 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: 1,
  });
}
