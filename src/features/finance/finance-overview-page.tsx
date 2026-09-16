import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  HandCoins,
  PiggyBank,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EMPTY_ARRAY } from "@/lib/empty";
import {
  ChartBlockSkeleton,
  StatCardsSkeleton,
} from "@/components/common/loading-skeletons";
import { EmptyState, StatCard } from "@/components/common/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useFinanceTransactionsQuery,
  useTransactionsQuery,
} from "@/api/queries";
import { useFinanceMonth } from "@/features/finance/finance-context";
import { categoryLabel } from "@/features/finance/lib/categories";
import {
  calculateCategoryTotals,
  calculateExpenseRatio,
  calculateLivingExpenses,
  calculateLoanCollectionsInRange,
  calculateMonthlyComparison,
  calculateRemainingCash,
  calculateSavingsRate,
  calculateTotalIncome,
  groupCashFlowByMonth,
  monthRangeKeys,
  monthDateBounds,
} from "@/features/finance/lib/calculations";
import {
  formatDateRangeLabel,
  previousEquivalentRange,
} from "@/features/finance/lib/date-range";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

function formatPct(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function FinanceOverviewPage() {
  const { month, from, to, preset } = useFinanceMonth();
  const [chartRange, setChartRange] = useState<"6" | "12" | "year">("6");

  const monthCount =
    chartRange === "6" ? 6 : chartRange === "12" ? 12 : Number(month.slice(5));
  const rangeMonths = useMemo(
    () => monthRangeKeys(month, Math.max(monthCount, 1)),
    [month, monthCount],
  );
  const chartFrom = `${rangeMonths[0]}-01`;
  const chartTo = monthDateBounds(month).to;
  const prevRange = useMemo(
    () => previousEquivalentRange(from, to),
    [from, to],
  );

  const periodFinanceQ = useFinanceTransactionsQuery({ from, to });
  const prevFinanceQ = useFinanceTransactionsQuery({
    from: prevRange.from,
    to: prevRange.to,
  });
  const rangeFinanceQ = useFinanceTransactionsQuery({
    from: chartFrom,
    to: chartTo,
  });
  const loanTxQ = useTransactionsQuery();

  const isLoading =
    periodFinanceQ.isLoading ||
    prevFinanceQ.isLoading ||
    rangeFinanceQ.isLoading ||
    loanTxQ.isLoading;
  const isError =
    periodFinanceQ.isError ||
    prevFinanceQ.isError ||
    rangeFinanceQ.isError ||
    loanTxQ.isError;

  const periodItems = periodFinanceQ.data ?? EMPTY_ARRAY;
  const prevItems = prevFinanceQ.data ?? EMPTY_ARRAY;
  const rangeItems = rangeFinanceQ.data ?? EMPTY_ARRAY;
  const loanTxs = loanTxQ.data ?? EMPTY_ARRAY;

  const income = calculateTotalIncome(periodItems);
  const expenses = calculateLivingExpenses(periodItems);
  const loanCollections = calculateLoanCollectionsInRange(loanTxs, from, to);
  const remaining = calculateRemainingCash({
    income,
    livingExpenses: expenses,
    loanCollections,
  });
  const expenseRatio = calculateExpenseRatio(expenses, income);
  const savingsRate = calculateSavingsRate(remaining, income, loanCollections);

  const prevIncome = calculateTotalIncome(prevItems);
  const prevExpenses = calculateLivingExpenses(prevItems);
  const prevLoan = calculateLoanCollectionsInRange(
    loanTxs,
    prevRange.from,
    prevRange.to,
  );
  const prevRemaining = calculateRemainingCash({
    income: prevIncome,
    livingExpenses: prevExpenses,
    loanCollections: prevLoan,
  });
  const hasPreviousData =
    prevItems.length > 0 || prevLoan > 0 || prevIncome > 0 || prevExpenses > 0;
  const comparison = calculateMonthlyComparison({
    currentIncome: income,
    previousIncome: prevIncome,
    currentExpenses: expenses,
    previousExpenses: prevExpenses,
    currentRemaining: remaining,
    previousRemaining: prevRemaining,
    hasPreviousData,
  });

  const expenseCats = calculateCategoryTotals(periodItems, "expense");
  const incomeCats = calculateCategoryTotals(periodItems, "income");

  const chartData = useMemo(() => {
    return groupCashFlowByMonth({
      financeTxs: rangeItems,
      loanTxs,
      months: rangeMonths,
    }).map((row) => ({
      ...row,
      label: format(parseISO(`${row.period}-01`), "MM/yy"),
    }));
  }, [rangeItems, loanTxs, rangeMonths]);

  const recent = useMemo(
    () =>
      [...periodItems]
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        )
        .slice(0, 5),
    [periodItems],
  );

  const periodLabel = formatDateRangeLabel(from, to, preset);

  if (isError) {
    return (
      <EmptyState
        title="Không tải được dữ liệu tài chính"
        description="Vui lòng thử lại sau."
        action={
          <Button
            variant="outline"
            onClick={() => {
              void periodFinanceQ.refetch();
              void prevFinanceQ.refetch();
              void rangeFinanceQ.refetch();
              void loanTxQ.refetch();
            }}
          >
            Thử lại
          </Button>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StatCardsSkeleton count={4} />
        <ChartBlockSkeleton />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartBlockSkeleton />
          <ChartBlockSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng thu"
          value={formatCurrency(income)}
          hint={periodLabel}
          icon={<ArrowUpRight className="size-4 text-success" />}
        />
        <StatCard
          title="Tổng chi"
          value={formatCurrency(expenses)}
          hint="Chi sinh hoạt"
          icon={<ArrowDownRight className="size-4 text-destructive" />}
        />
        <StatCard
          title="Còn lại"
          value={formatCurrency(remaining)}
          hint={
            savingsRate !== null
              ? `Tỷ lệ tiết kiệm ${savingsRate.toFixed(1)}%`
              : undefined
          }
          icon={<PiggyBank className="size-4" />}
        />
        <StatCard
          title="Thu từ khoản vay"
          value={formatCurrency(loanCollections)}
          hint="Lời + gốc đã thu"
          icon={<HandCoins className="size-4 text-success" />}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Dòng tiền theo tháng</CardTitle>
          <Select
            value={chartRange}
            onValueChange={(v) => setChartRange(v as "6" | "12" | "year")}
          >
            <SelectTrigger className="w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 tháng</SelectItem>
              <SelectItem value="12">12 tháng</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.every(
            (d) =>
              d.income === 0 &&
              d.expenses === 0 &&
              d.loanCollections === 0,
          ) ? (
            <EmptyState
              title="Chưa có dữ liệu biểu đồ"
              description="Thêm giao dịch thu/chi để xem xu hướng."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat("vi-VN", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(Number(v))
                  }
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Thu"
                  stroke="var(--color-success)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Chi"
                  stroke="var(--color-destructive)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  name="Còn lại"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phân bổ {periodLabel.toLowerCase()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Thu nhập" value={formatCurrency(income)} tone="success" />
            <Row
              label="Thu từ khoản vay"
              value={formatCurrency(loanCollections)}
              tone="success"
            />
            <Row
              label="Chi sinh hoạt"
              value={formatCurrency(expenses)}
              tone="danger"
            />
            <div className="border-t pt-3">
              <Row
                label="Còn lại"
                value={formatCurrency(remaining)}
                tone={remaining >= 0 ? "success" : "danger"}
                strong
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Snapshot
                label="% chi / thu"
                value={
                  expenseRatio !== null ? `${expenseRatio.toFixed(1)}%` : "—"
                }
              />
              <Snapshot
                label="Tỷ lệ tiết kiệm"
                value={
                  savingsRate !== null ? `${savingsRate.toFixed(1)}%` : "—"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">So với tháng trước</CardTitle>
          </CardHeader>
          <CardContent>
            {!comparison ? (
              <p className="text-sm text-muted-foreground">
                Chưa có dữ liệu so sánh
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <CompareRow label="Thu nhập" value={comparison.income} />
                <CompareRow label="Chi tiêu" value={comparison.expenses} invert />
                <CompareRow label="Còn lại" value={comparison.remaining} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBars title="Chi theo danh mục" items={expenseCats} tone="danger" />
        <CategoryBars title="Thu theo danh mục" items={incomeCats} tone="success" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Giao dịch gần đây</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/finance/transactions">Xem tất cả</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              title="Chưa có giao dịch trong tháng"
              description="Bắt đầu bằng cách thêm thu nhập hoặc chi tiêu."
            />
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {recent.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(tx.createdAt)} · {categoryLabel(tx.category)}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-semibold",
                        tx.type === "income"
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {tx.type === "income" ? "+" : "−"}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{formatDate(tx.createdAt)}</TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {categoryLabel(tx.category)}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium",
                            tx.type === "income"
                              ? "text-success"
                              : "text-destructive",
                          )}
                        >
                          {tx.type === "income" ? "+" : "−"}
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-muted-foreground", strong && "font-medium text-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "font-medium tabular-nums",
          strong && "text-base font-semibold",
          tone === "success" && "text-success",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CompareRow({
  label,
  value,
  invert,
}: {
  label: string;
  value: number | null;
  invert?: boolean;
}) {
  const positive = value !== null && (invert ? value < 0 : value > 0);
  const negative = value !== null && (invert ? value > 0 : value < 0);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          positive && "text-success",
          negative && "text-destructive",
        )}
      >
        {formatPct(value)}
      </span>
    </div>
  );
}

function CategoryBars({
  title,
  items,
  tone,
}: {
  title: string;
  items: { category: string; amount: number; percent: number }[];
  tone: "success" | "danger";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{categoryLabel(item.category)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatCurrency(item.amount)} · {item.percent.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      tone === "success" ? "bg-success" : "bg-destructive/70",
                    )}
                    style={{ width: `${Math.min(item.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
