import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  eachDayOfInterval,
  format,
  parseISO,
  subDays,
} from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  HandCoins,
  PiggyBank,
  Search,
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
import { EmptyState } from "@/components/common/status-badges";
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
  useFinanceCategoriesQuery,
  useFinanceTransactionsQuery,
  useTransactionsQuery,
} from "@/api/queries";
import { useFinanceMonth } from "@/features/finance/finance-context";
import { categoryLabel } from "@/features/finance/lib/categories";
import { categoryIcon } from "@/features/finance/lib/category-icons";
import {
  calculateCategoryTotals,
  calculateExpenseRatio,
  calculateLivingExpenses,
  calculateLoanCollectionsInRange,
  calculateRemainingCash,
  calculateSavingsRate,
  calculateTotalIncome,
  groupCashFlowByMonth,
  monthDateBounds,
  monthRangeKeys,
  percentChange,
} from "@/features/finance/lib/calculations";
import {
  formatDateRangeLabel,
  previousEquivalentRange,
} from "@/features/finance/lib/date-range";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import type { FinanceCategoryRecord, FinanceTransaction } from "@/types/finance";
import type { Transaction } from "@/types/transaction";

type ChartWindow = "7d" | "30d" | "3m" | "6m" | "12m";

const CHART_WINDOWS: { value: ChartWindow; label: string }[] = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "3m", label: "3 tháng" },
  { value: "6m", label: "6 tháng" },
  { value: "12m", label: "12 tháng" },
];

function greeting(name: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "sáng" : hour < 18 ? "chiều" : "tối";
  return name ? `Chào buổi ${part}, ${name}!` : `Chào buổi ${part}!`;
}

function deltaText(current: number, previous: number, hasPrevious: boolean): string {
  if (!hasPrevious) {
    return current === 0 ? "Không có thay đổi" : "Chưa có kỳ trước";
  }
  const pct = percentChange(current, previous);
  if (pct === null || pct === 0) return "Không có thay đổi";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% so với kỳ trước`;
}

function deltaTone(current: number, previous: number, hasPrevious: boolean): "up" | "down" | "flat" {
  if (!hasPrevious) return "flat";
  const pct = percentChange(current, previous);
  if (pct === null || pct === 0) return "flat";
  return pct > 0 ? "up" : "down";
}

export function FinanceOverviewPage() {
  const username = useAuthStore((s) => s.session?.username ?? "");
  const { from, to, preset } = useFinanceMonth();
  const [chartWindow, setChartWindow] = useState<ChartWindow>("30d");
  const [expenseFocus, setExpenseFocus] = useState("all");
  const [incomeFocus, setIncomeFocus] = useState("all");

  const chartBounds = useMemo(
    () => resolveChartBounds(chartWindow, to),
    [chartWindow, to],
  );
  const prevRange = useMemo(
    () => previousEquivalentRange(from, to),
    [from, to],
  );

  const periodFinanceQ = useFinanceTransactionsQuery({ from, to });
  const categoriesQuery = useFinanceCategoriesQuery();
  const catalog = categoriesQuery.data;
  const prevFinanceQ = useFinanceTransactionsQuery({
    from: prevRange.from,
    to: prevRange.to,
  });
  const rangeFinanceQ = useFinanceTransactionsQuery({
    from: chartBounds.from,
    to: chartBounds.to,
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

  const expenseCats = calculateCategoryTotals(periodItems, "expense");
  const incomeCats = calculateCategoryTotals(periodItems, "income");

  const chartData = useMemo(() => {
    if (chartBounds.months) {
      return groupCashFlowByMonth({
        financeTxs: rangeItems,
        loanTxs,
        months: chartBounds.months,
      }).map((row) => ({
        label: format(parseISO(`${row.period}-01`), "MM/yy"),
        income: row.income,
        expenses: row.expenses,
        remaining: row.remaining,
      }));
    }
    return groupCashFlowByDay({
      financeTxs: rangeItems,
      loanTxs,
      from: chartBounds.from,
      to: chartBounds.to,
    });
  }, [chartBounds, rangeItems, loanTxs]);

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
      </div>
    );
  }

  const cards = [
    {
      title: "Tổng thu",
      value: income,
      previous: prevIncome,
      icon: ArrowUpRight,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Tổng chi",
      value: expenses,
      previous: prevExpenses,
      icon: ArrowDownRight,
      iconClass: "bg-rose-50 text-rose-600",
    },
    {
      title: "Còn lại",
      value: remaining,
      previous: prevRemaining,
      icon: PiggyBank,
      iconClass: "bg-violet-50 text-violet-600",
    },
    {
      title: "Thu từ khoản vay",
      value: loanCollections,
      previous: prevLoan,
      icon: HandCoins,
      iconClass: "bg-sky-50 text-sky-600",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{greeting(username)}</h1>
        <p className="text-sm text-muted-foreground">
          Cùng xem tình hình tài chính của bạn trong kỳ này.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const tone = deltaTone(card.value, card.previous, hasPreviousData);
          return (
            <section key={card.title} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={cn("flex size-8 items-center justify-center rounded-full", card.iconClass)}>
                  <Icon className="size-4" />
                </span>
                {card.title}
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                {formatCurrency(card.value)}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  tone === "up" && "text-emerald-600",
                  tone === "down" && "text-rose-600",
                  tone === "flat" && "text-muted-foreground",
                )}
              >
                {deltaText(card.value, card.previous, hasPreviousData)}
              </p>
            </section>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Dòng tiền theo thời gian</CardTitle>
          <div className="flex flex-wrap gap-1">
            {CHART_WINDOWS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs",
                  chartWindow === item.value
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
                onClick={() => setChartWindow(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.every((d) => d.income === 0 && d.expenses === 0 && d.remaining === 0) ? (
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
                <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Thu" stroke="var(--color-success)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" name="Chi" stroke="var(--color-destructive)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="remaining" name="Còn lại" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Tình hình tài chính</CardTitle>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <MoneyRow label="Thu nhập" value={income} tone="up" hint={deltaText(income, prevIncome, hasPreviousData)} />
            <MoneyRow label="Chi tiêu" value={expenses} tone="down" hint={deltaText(expenses, prevExpenses, hasPreviousData)} />
            <MoneyRow label="Còn lại" value={remaining} hint={deltaText(remaining, prevRemaining, hasPreviousData)} />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <MiniStat label="Tỷ lệ chi tiêu" value={expenseRatio !== null ? `${expenseRatio.toFixed(1)}%` : "—"} />
              <MiniStat label="Tỷ lệ tiết kiệm" value={savingsRate !== null ? `${savingsRate.toFixed(1)}%` : "—"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">So với kỳ trước</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasPreviousData ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Search className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Chưa có dữ liệu so sánh</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Dữ liệu sẽ hiện khi bạn có thêm giao dịch ở kỳ trước.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <CompareRow label="Thu nhập" current={income} previous={prevIncome} />
                <CompareRow label="Chi tiêu" current={expenses} previous={prevExpenses} />
                <CompareRow label="Còn lại" current={remaining} previous={prevRemaining} />
                <CompareRow label="Thu từ khoản vay" current={loanCollections} previous={prevLoan} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryBars
          title="Chi tiêu theo danh mục"
          items={expenseCats}
          focus={expenseCats.some((item) => item.category === expenseFocus) ? expenseFocus : "all"}
          onFocus={setExpenseFocus}
          catalog={catalog}
        />
        <CategoryBars
          title="Thu theo danh mục"
          items={incomeCats}
          focus={incomeCats.some((item) => item.category === incomeFocus) ? incomeFocus : "all"}
          onFocus={setIncomeFocus}
          catalog={catalog}
        />
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
              title="Chưa có giao dịch trong kỳ này"
              description="Bắt đầu bằng cách thêm thu nhập hoặc chi tiêu."
            />
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {recent.map((tx) => (
                  <RecentRow key={tx.id} tx={tx} catalog={catalog} />
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
                    {recent.map((tx) => {
                      const meta = categoryMeta(tx.category, catalog);
                      const Icon = meta.icon;
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(tx.createdAt)}
                          </TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="flex size-7 items-center justify-center rounded-lg text-white"
                                style={{ backgroundColor: meta.color }}
                              >
                                <Icon className="size-3.5" />
                              </span>
                              {meta.name}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium tabular-nums",
                              tx.type === "income" ? "text-emerald-600" : "text-rose-600",
                            )}
                          >
                            {tx.type === "income" ? "+" : "−"}
                            {formatCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

function resolveChartBounds(window: ChartWindow, anchorTo: string): {
  from: string;
  to: string;
  months?: string[];
} {
  if (window === "7d" || window === "30d") {
    const end = parseISO(anchorTo);
    const start = subDays(end, window === "7d" ? 6 : 29);
    return {
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    };
  }
  const count = window === "3m" ? 3 : window === "6m" ? 6 : 12;
  const months = monthRangeKeys(anchorTo.slice(0, 7), count);
  return {
    from: `${months[0]}-01`,
    to: monthDateBounds(months[months.length - 1]!).to,
    months,
  };
}

function groupCashFlowByDay(params: {
  financeTxs: FinanceTransaction[];
  loanTxs: Transaction[];
  from: string;
  to: string;
}): { label: string; income: number; expenses: number; remaining: number }[] {
  const days = eachDayOfInterval({
    start: parseISO(params.from),
    end: parseISO(params.to),
  });
  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const items = params.financeTxs.filter((tx) => tx.date.slice(0, 10) === key);
    const income = calculateTotalIncome(items);
    const expenses = calculateLivingExpenses(items);
    const loanCollections = calculateLoanCollectionsInRange(params.loanTxs, key, key);
    return {
      label: format(day, "dd/MM"),
      income,
      expenses,
      remaining: calculateRemainingCash({
        income,
        livingExpenses: expenses,
        loanCollections,
      }),
    };
  });
}

function categoryMeta(
  key: string,
  catalog?: FinanceCategoryRecord[] | null,
): { name: string; color: string; icon: ReturnType<typeof categoryIcon> } {
  const row = catalog?.find((item) => item.key === key);
  return {
    name: categoryLabel(key, catalog),
    color: row?.color ?? "#64748b",
    icon: categoryIcon(row?.icon),
  };
}

function MoneyRow({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span
          className={cn(
            "block font-medium tabular-nums",
            tone === "up" && "text-emerald-600",
            tone === "down" && "text-rose-600",
          )}
        >
          {formatCurrency(value)}
        </span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CompareRow({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const pct = percentChange(current, previous);
  const tone = pct === null || pct === 0 ? "flat" : pct > 0 ? "up" : "down";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          tone === "up" && "text-emerald-600",
          tone === "down" && "text-rose-600",
        )}
      >
        {pct === null || pct === 0
          ? "Không có thay đổi"
          : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}
      </span>
    </div>
  );
}

function CategoryBars({
  title,
  items,
  focus,
  onFocus,
  catalog,
}: {
  title: string;
  items: { category: string; amount: number; percent: number }[];
  focus: string;
  onFocus: (value: string) => void;
  catalog?: FinanceCategoryRecord[] | null;
}) {
  const shown = focus === "all" ? items : items.filter((item) => item.category === focus);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <Select value={focus} onValueChange={onFocus}>
          <SelectTrigger className="h-8 w-[10.5rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {items.map((item) => (
              <SelectItem key={item.category} value={item.category}>
                {categoryLabel(item.category, catalog)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-3">
            {shown.map((item) => {
              const meta = categoryMeta(item.category, catalog);
              const Icon = meta.icon;
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Icon className="size-3" />
                      </span>
                      <span className="truncate">{meta.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCurrency(item.amount)} · {item.percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(item.percent, 100)}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentRow({
  tx,
  catalog,
}: {
  tx: FinanceTransaction;
  catalog?: FinanceCategoryRecord[] | null;
}) {
  const meta = categoryMeta(tx.category, catalog);
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{tx.description}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(tx.createdAt)} · {meta.name}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          tx.type === "income" ? "text-emerald-600" : "text-rose-600",
        )}
      >
        {tx.type === "income" ? "+" : "−"}
        {formatCurrency(tx.amount)}
      </p>
    </div>
  );
}
