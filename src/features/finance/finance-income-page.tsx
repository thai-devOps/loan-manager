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
  calculateTotalIncome,
} from "@/features/finance/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import { formatPeriod } from "@/lib/date";

export function FinanceIncomePage() {
  const { month } = useFinanceMonth();
  const { openCreate } = useFinanceOutlet();
  const q = useFinanceTransactionsQuery({ month });
  const items = (q.data ?? EMPTY_ARRAY).filter((t) => t.type === "income");
  const total = calculateTotalIncome(items);
  const cats = calculateCategoryTotals(items, "income");

  if (q.isError) {
    return (
      <EmptyState
        title="Không tải được thu nhập"
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
          title="Tổng thu nhập"
          value={formatCurrency(total)}
          hint={formatPeriod(month)}
        />
        <Button className="gap-1.5" onClick={() => openCreate("income")}>
          <Plus className="size-4" />
          Thêm thu nhập
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phân bổ theo danh mục</CardTitle>
        </CardHeader>
        <CardContent>
          {cats.length === 0 ? (
            <EmptyState
              title="Chưa có thu nhập trong tháng"
              description="Ghi nhận lương, thưởng hoặc nguồn thu khác."
              action={
                <Button onClick={() => openCreate("income")}>
                  Thêm thu nhập
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
                      className="h-full rounded-full bg-success"
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
