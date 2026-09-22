import { useMemo } from "react";
import {
  useFinanceTransactionsQuery,
  useLoansQuery,
  useManualAssetsQuery,
} from "@/api/queries";
import type { AppFeatureId } from "@/components/layout/nav-items";
import { resolveDateRangePreset } from "@/features/finance/lib/date-range";
import { getSalaryPayday } from "@/features/finance/lib/finance-prefs";
import { HUB_STATIC_BADGE } from "@/features/apps/hub-meta";

/** Lightweight badge labels for hub cards; falls back to static copy. */
export function useHubBadges(enabled: {
  loans: boolean;
  finance: boolean;
  assets: boolean;
}): Record<AppFeatureId, string> {
  const salaryRange = useMemo(
    () =>
      resolveDateRangePreset("this_salary_cycle", {
        salaryPayday: getSalaryPayday(),
      }),
    [],
  );

  const loansQ = useLoansQuery();
  const financeQ = useFinanceTransactionsQuery({
    from: salaryRange.from,
    to: salaryRange.to,
  });
  const assetsQ = useManualAssetsQuery();

  return useMemo(() => {
    const badges = { ...HUB_STATIC_BADGE };

    if (enabled.loans && loansQ.data) {
      const active = loansQ.data.filter((l) => l.status === "ACTIVE").length;
      badges.loans =
        active > 0 ? `${active} khoản vay` : HUB_STATIC_BADGE.loans;
    }

    if (enabled.finance && financeQ.data) {
      const n = financeQ.data.length;
      badges.finance =
        n > 0 ? `${n} giao dịch kỳ này` : HUB_STATIC_BADGE.finance;
    }

    if (enabled.assets && assetsQ.data) {
      const n = assetsQ.data.length;
      badges.assets =
        n > 0 ? `${n} loại tài sản` : HUB_STATIC_BADGE.assets;
    }

    return badges;
  }, [
    enabled.loans,
    enabled.finance,
    enabled.assets,
    loansQ.data,
    financeQ.data,
    assetsQ.data,
  ]);
}
