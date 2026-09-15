import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { FeatureSubNav } from "@/components/layout/feature-sub-nav";
import { getFeatureById } from "@/components/layout/nav-items";
import { PageShell } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/date-picker";
import { TransactionFormDialog } from "@/features/finance/components/transaction-form-dialog";
import {
  FinanceMonthContext,
  type FinanceMonthContextValue,
} from "@/features/finance/finance-context";
import { currentMonthKey } from "@/features/finance/lib/calculations";
import { todayDateInput } from "@/lib/date";
import type { FinanceTransaction } from "@/types/finance";

export function FinanceLayout() {
  const location = useLocation();
  const [month, setMonth] = useState(currentMonthKey);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<"income" | "expense">(
    "expense",
  );
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);

  const ctx = useMemo<FinanceMonthContextValue>(
    () => ({
      month,
      setMonth,
      openCreate: (type = "expense") => {
        setEditing(null);
        setDefaultType(type);
        setDialogOpen(true);
      },
    }),
    [month],
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
    }),
    [ctx.openCreate, month],
  );

  const feature = getFeatureById("finance");

  return (
    <FinanceMonthContext.Provider value={ctx}>
      <PageShell
        header={
          <AppHeader
            title="Tài chính"
            description="Theo dõi thu chi cá nhân theo tháng"
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
        <div className="flex items-center justify-end gap-2">
          <label
            htmlFor="finance-month"
            className="text-sm text-muted-foreground"
          >
            Tháng
          </label>
          <MonthPicker
            id="finance-month"
            className="w-[11rem]"
            value={month}
            onChange={setMonth}
          />
        </div>

        <Outlet key={location.pathname} context={outletContext} />

        <TransactionFormDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}
          editing={editing}
          defaultType={defaultType}
          defaultDate={
            month === currentMonthKey() ? todayDateInput() : `${month}-01`
          }
        />
      </PageShell>
    </FinanceMonthContext.Provider>
  );
}
