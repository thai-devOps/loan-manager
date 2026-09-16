import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { FeatureSubNav } from "@/components/layout/feature-sub-nav";
import { getFeatureById } from "@/components/layout/nav-items";
import { PageShell } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "@/features/finance/components/period-filter";
import { TransactionFormDialog } from "@/features/finance/components/transaction-form-dialog";
import {
  FinanceMonthContext,
  type FinanceMonthContextValue,
} from "@/features/finance/finance-context";
import {
  anchorMonthKey,
  defaultTransactionDateForRange,
  resolveDateRangePreset,
  type DateRangePreset,
} from "@/features/finance/lib/date-range";
import type { FinanceTransaction } from "@/types/finance";

export function FinanceLayout() {
  const [preset, setPresetState] = useState<DateRangePreset>("this_month");
  const [range, setRange] = useState(() =>
    resolveDateRangePreset("this_month"),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<"income" | "expense">(
    "expense",
  );
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);

  const setPreset = (next: DateRangePreset) => {
    setPresetState(next);
    if (next !== "custom") {
      setRange(resolveDateRangePreset(next));
    } else {
      setRange((prev) => resolveDateRangePreset("custom", prev));
    }
  };

  const setCustomRange = (from: string, to: string) => {
    setPresetState("custom");
    setRange(resolveDateRangePreset("custom", { from, to }));
  };

  const month = anchorMonthKey(range.to);

  const ctx = useMemo<FinanceMonthContextValue>(
    () => ({
      preset,
      from: range.from,
      to: range.to,
      month,
      setPreset,
      setCustomRange,
      openCreate: (type = "expense") => {
        setEditing(null);
        setDefaultType(type);
        setDialogOpen(true);
      },
    }),
    [preset, range.from, range.to, month],
  );

  const outletContext = useMemo(
    () => ({
      openEdit: (tx: FinanceTransaction) => {
        setEditing(tx);
        setDefaultType(tx.type);
        setDialogOpen(true);
      },
      openCreate: ctx.openCreate,
      month,
      from: range.from,
      to: range.to,
    }),
    [ctx.openCreate, month, range.from, range.to],
  );

  const feature = getFeatureById("finance");

  return (
    <FinanceMonthContext.Provider value={ctx}>
      <PageShell
        header={
          <AppHeader
            title="Tài chính"
            description="Theo dõi thu chi cá nhân theo thời gian"
            actions={
              <Button
                size="sm"
                onClick={() => ctx.openCreate("expense")}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Thêm giao dịch</span>
                <span className="sm:hidden">Thêm</span>
              </Button>
            }
          />
        }
        subNav={<FeatureSubNav items={feature.nav} />}
      >
        <PeriodFilter
          preset={preset}
          from={range.from}
          to={range.to}
          onPresetChange={setPreset}
          onCustomRangeChange={setCustomRange}
        />

        <Outlet context={outletContext} />

        <TransactionFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}
          editing={editing}
          defaultType={defaultType}
          defaultDate={defaultTransactionDateForRange(range.from, range.to)}
        />
      </PageShell>
    </FinanceMonthContext.Provider>
  );
}
