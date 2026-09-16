import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/api/query-keys";
import { isDbOpen } from "@/db/database";
import { borrowerRepository } from "@/db/repositories/borrowerRepository";
import { financeRepository } from "@/db/repositories/financeRepository";
import { loanRepository } from "@/db/repositories/loanRepository";
import { assetRepository } from "@/db/repositories/assetRepository";
import { resolveScheduleStatus } from "@/lib/calculations";
import { resolveDateRangePreset } from "@/features/finance/lib/date-range";

/** Warm TanStack Query cache before route paint (pointer/touch intent). */
export function prefetchFeatureRoute(href: string): void {
  if (!isDbOpen()) return;

  const path = href.split("?")[0] ?? href;

  if (path === "/" || path.startsWith("/borrowers") || path.startsWith("/loans") || path.startsWith("/payments") || path.startsWith("/schedules") || path.startsWith("/transactions")) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.borrowers.all,
      queryFn: () => borrowerRepository.list(),
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.loans.all(),
      queryFn: () => loanRepository.list(),
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.transactions.all,
      queryFn: () => loanRepository.listTransactions(),
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.schedules.all(),
      queryFn: async () => {
        let rows = await loanRepository.listSchedules();
        return rows.map((s) => ({
          ...s,
          status: resolveScheduleStatus(s),
        }));
      },
    });
    return;
  }

  if (path === "/finance" || path.startsWith("/finance/")) {
    const range = resolveDateRangePreset("this_month");
    void queryClient.prefetchQuery({
      queryKey: queryKeys.finance.range(range.from, range.to),
      queryFn: () =>
        financeRepository.list({ from: range.from, to: range.to }),
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.transactions.all,
      queryFn: () => loanRepository.listTransactions(),
    });
    return;
  }

  if (path === "/assets" || path.startsWith("/assets/")) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.assets.summary,
      queryFn: () => assetRepository.getSummary(),
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.assets.goldPurchases,
      queryFn: () => assetRepository.listGoldPurchases(),
    });
    return;
  }

  if (path === "/reports" || path.startsWith("/reports/")) {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.loans.all(),
      queryFn: () => loanRepository.list(),
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.transactions.all,
      queryFn: () => loanRepository.listTransactions(),
    });
  }
}
