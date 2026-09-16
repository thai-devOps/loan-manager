import { useQuery } from "@tanstack/react-query";
import { fetchAssetSnapshots, syncSchedules } from "@/api/endpoints";
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
      // Best-effort server schedule horizon extension when online
      if (typeof navigator !== "undefined" && navigator.onLine) {
        await syncSchedules().catch(() => undefined);
      }
      let rows = await loanRepository.listSchedules();
      rows = rows.map((s) => ({
        ...s,
        status: resolveScheduleStatus(s),
      }));
      if (status && status !== "ALL") {
        rows = rows.filter((s) => s.status === status);
      }
      return rows;
    },
    enabled: dbReady && isDbOpen(),
  });
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
