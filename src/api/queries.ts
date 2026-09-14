import { useQuery } from "@tanstack/react-query";
import {
  fetchBorrower,
  fetchBorrowers,
  fetchFinanceTransactions,
  fetchLoanDetail,
  fetchLoans,
  fetchSchedules,
  fetchStats,
  fetchTransactions,
  syncSchedules,
} from "@/api/endpoints";
import { queryKeys } from "@/api/query-keys";

export function useBorrowersQuery() {
  return useQuery({
    queryKey: queryKeys.borrowers.all,
    queryFn: fetchBorrowers,
  });
}

export function useBorrowerQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.borrowers.detail(id),
    queryFn: () => fetchBorrower(id),
    enabled: Boolean(id),
  });
}

export function useLoansQuery(status?: string) {
  return useQuery({
    queryKey: queryKeys.loans.all(status),
    queryFn: () => fetchLoans(status),
  });
}

export function useLoanDetailQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.loans.detail(id),
    queryFn: () => fetchLoanDetail(id),
    enabled: Boolean(id),
  });
}

export function useTransactionsQuery() {
  return useQuery({
    queryKey: queryKeys.transactions.all,
    queryFn: () => fetchTransactions(),
  });
}

export function useSchedulesQuery(status?: string) {
  return useQuery({
    queryKey: queryKeys.schedules.all(status),
    queryFn: async () => {
      await syncSchedules().catch(() => undefined);
      return fetchSchedules(status);
    },
  });
}

export function useStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats.all,
    queryFn: fetchStats,
  });
}

export function useFinanceTransactionsQuery(params?: {
  month?: string;
  from?: string;
  to?: string;
}) {
  const key = params?.month
    ? queryKeys.finance.month(params.month)
    : params?.from && params?.to
      ? queryKeys.finance.range(params.from, params.to)
      : queryKeys.finance.all;
  return useQuery({
    queryKey: key,
    queryFn: () => fetchFinanceTransactions(params),
  });
}
