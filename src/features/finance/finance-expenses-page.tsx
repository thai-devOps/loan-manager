import { Plus } from "lucide-react";
import { EMPTY_ARRAY } from "@/lib/empty";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, StatCard } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinanceTransactionsQuery } from "@/api/queries";
import { useFinanceMonth } from "@/features/finance/finance-context";
import { useFinanceOutlet } from "@/features/finance/use-finance-outlet";
import { categoryLabel } from "@/features/finance/lib/categories";
import {
  calculateCategoryTotals,
  calculateLivingExpenses,
} from "@/features/finance/lib/calculations";
import { formatDateRangeLabel } from "@/features/finance/lib/date-range";
import { formatCurrency } from "@/lib/currency";

export function FinanceExpensesPage() {
  const { from, to, preset } = useFinanceMonth();
  const { openCreate } = useFinanceOutlet();
  const q = useFinanceTransactionsQuery({ from, to });
  const items = (q.data ?? EMPTY_ARRAY).filter((t) => t.type === "expense");
  const total = calculateLivingExpenses(items);
  const cats = calculateCategoryTotals(items, "expense");

  if (q.isError) {
    return (
      <EmptyState
        title="Không tải được chi tiêu"
        action={
          <Button variant="outline" onClick={() => void q.refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  if (q.isLoading) return <TablePageSkeleton showSearch={false} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <StatCard
          title="Tổng chi tiêu"
          value={formatCurrency(total)}
          hint={formatDateRangeLabel(from, to, preset)}
        />
        <Button className="gap-1.5" onClick={() => openCreate("expense")}>
          <Plus className="size-4" />
          Thêm chi tiêu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phân bổ theo danh mục</CardTitle>
        </CardHeader>
        <CardContent>
          {cats.length === 0 ? (
            <EmptyState
              title="Chưa có chi tiêu trong tháng"
              description="Ghi nhận chi sinh hoạt để theo dõi còn lại."
              action={
                <Button onClick={() => openCreate("expense")}>
                  Thêm chi tiêu
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {cats.map((item) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{categoryLabel(item.category)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(item.amount)} · {item.percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-destructive/70"
                      style={{ width: `${Math.min(item.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
