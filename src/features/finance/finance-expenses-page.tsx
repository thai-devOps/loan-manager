import { useMemo, useState, type ComponentType } from "react";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import {
  Car,
  Droplets,
  Heart,
  Home,
  MoreHorizontal,
  Plus,
  Receipt,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";
import { EMPTY_ARRAY } from "@/lib/empty";
import { EmptyState } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceCategoriesQuery, useFinanceTransactionsQuery } from "@/api/queries";
import { useFinanceMonth } from "@/features/finance/finance-context";
import { useFinanceOutlet } from "@/features/finance/use-finance-outlet";
import { categoryIcon } from "@/features/finance/lib/category-icons";
import { categoryLabel } from "@/features/finance/lib/categories";
import {
  calculateCategoryTotals,
  calculateLivingExpenses,
  percentChange,
} from "@/features/finance/lib/calculations";
import { previousEquivalentRange } from "@/features/finance/lib/date-range";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Can } from "@/features/auth/can";
import { PERMISSIONS } from "@/config/permissions";

const CATEGORY_STYLE: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>;
    color: string;
    soft: string;
    bar: string;
  }
> = {
  shopping: {
    icon: ShoppingCart,
    color: "#3b82f6",
    soft: "bg-blue-50 text-blue-600",
    bar: "bg-blue-500",
  },
  food: {
    icon: Utensils,
    color: "#f43f5e",
    soft: "bg-rose-50 text-rose-600",
    bar: "bg-rose-500",
  },
  transport: {
    icon: Car,
    color: "#22c55e",
    soft: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-500",
  },
  electricity: {
    icon: Zap,
    color: "#f59e0b",
    soft: "bg-amber-50 text-amber-600",
    bar: "bg-amber-400",
  },
  housing: {
    icon: Home,
    color: "#8b5cf6",
    soft: "bg-violet-50 text-violet-600",
    bar: "bg-violet-500",
  },
  bills: {
    icon: Receipt,
    color: "#64748b",
    soft: "bg-slate-100 text-slate-600",
    bar: "bg-slate-400",
  },
  water: {
    icon: Droplets,
    color: "#0ea5e9",
    soft: "bg-sky-50 text-sky-600",
    bar: "bg-sky-500",
  },
  wifi: {
    icon: Wifi,
    color: "#6366f1",
    soft: "bg-indigo-50 text-indigo-600",
    bar: "bg-indigo-500",
  },
  family: {
    icon: Users,
    color: "#ec4899",
    soft: "bg-pink-50 text-pink-600",
    bar: "bg-pink-500",
  },
  entertainment: {
    icon: Sparkles,
    color: "#a855f7",
    soft: "bg-purple-50 text-purple-600",
    bar: "bg-purple-500",
  },
  health: {
    icon: Heart,
    color: "#ef4444",
    soft: "bg-red-50 text-red-500",
    bar: "bg-red-400",
  },
  other_expense: {
    icon: MoreHorizontal,
    color: "#94a3b8",
    soft: "bg-slate-100 text-slate-500",
    bar: "bg-slate-300",
  },
};

function styleFor(
  category: string,
  rows?: { key: string; icon: string; color: string }[] | null,
) {
  const row = rows?.find((item) => item.key === category);
  const fallback = CATEGORY_STYLE[category];
  return {
    icon: row ? categoryIcon(row.icon) : (fallback?.icon ?? Wallet),
    color: row?.color ?? fallback?.color ?? "#64748b",
    soft: fallback?.soft ?? "bg-muted text-muted-foreground",
    bar: fallback?.bar ?? "bg-muted-foreground/50",
    fromApi: Boolean(row),
  };
}

export function FinanceExpensesPage() {
  const { from, to } = useFinanceMonth();
  const { openCreate } = useFinanceOutlet();
  const [view, setView] = useState<"chart" | "list">("chart");
  const q = useFinanceTransactionsQuery({ from, to });
  const categoriesQuery = useFinanceCategoriesQuery();
  const catalog = categoriesQuery.data;
  const prevRange = useMemo(
    () => previousEquivalentRange(from, to),
    [from, to],
  );
  const prevQ = useFinanceTransactionsQuery({
    from: prevRange.from,
    to: prevRange.to,
  });

  const items = (q.data ?? EMPTY_ARRAY).filter((t) => t.type === "expense");
  const prevItems = (prevQ.data ?? EMPTY_ARRAY).filter(
    (t) => t.type === "expense",
  );
  const total = calculateLivingExpenses(items);
  const prevTotal = calculateLivingExpenses(prevItems);
  const delta = prevQ.data ? percentChange(total, prevTotal) : null;
  const cats = calculateCategoryTotals(items, "expense");
  const topCats = cats.slice(0, 6);

  const spark = useMemo(() => {
    const start = parseISO(from);
    const end = parseISO(to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return [];
    }
    const byDay = new Map<string, number>();
    for (const t of items) {
      const day = t.date.slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + t.amount);
    }
    return eachDayOfInterval({ start, end }).map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return { day: key, amount: byDay.get(key) ?? 0 };
    });
  }, [from, to, items]);

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

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.1fr)_2fr]">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Chi tiêu</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi chi tiêu các khoản chi tiêu của bạn theo thời gian
          </p>
        </div>
        <Can permission={PERMISSIONS.FINANCE_TRANSACTION_CREATE}>
          <Button className="gap-1.5" onClick={() => openCreate("expense")}>
            <Plus className="size-4" />
            Thêm chi tiêu
          </Button>
        </Can>
      </div>

      {cats.length === 0 ? (
        <EmptyState
          title="Chưa có chi tiêu trong kỳ này"
          description="Ghi nhận chi sinh hoạt để xem tỷ lệ và phân bổ."
          action={
            <Can permission={PERMISSIONS.FINANCE_TRANSACTION_CREATE}>
              <Button onClick={() => openCreate("expense")}>
                Thêm chi tiêu
              </Button>
            </Can>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.15fr)_minmax(0,2fr)]">
            <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Wallet className="size-4 text-sky-500" />
                    Tổng chi tiêu
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                    {formatCurrency(total)}
                  </p>
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1 text-xs font-medium",
                      delta == null
                        ? "text-muted-foreground"
                        : delta <= 0
                          ? "text-emerald-600"
                          : "text-rose-600",
                    )}
                  >
                    {delta == null ? (
                      "Chưa có kỳ trước để so sánh"
                    ) : (
                      <>
                        {delta <= 0 ? (
                          <TrendingDown className="size-3.5" />
                        ) : (
                          <TrendingUp className="size-3.5" />
                        )}
                        {Math.abs(delta).toFixed(0)}% so với kỳ trước
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="pointer-events-none absolute right-2 bottom-1 h-16 w-[55%]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spark}>
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {topCats.map((item) => {
                const style = styleFor(item.category, catalog);
                const Icon = style.icon;
                return (
                  <section
                    key={item.category}
                    className="rounded-2xl border border-border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-muted-foreground">
                        {categoryLabel(item.category, catalog)}
                      </p>
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg",
                          !style.fromApi && style.soft,
                        )}
                        style={
                          style.fromApi
                            ? { backgroundColor: style.color, color: "#fff" }
                            : undefined
                        }
                      >
                        <Icon className="size-3.5" />
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-semibold tabular-nums">
                      {formatCurrency(item.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.percent.toFixed(0)}%
                    </p>
                  </section>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  Tỷ lệ chi tiêu theo danh mục
                </h2>
                <div className="inline-flex rounded-full bg-muted p-0.5 text-xs">
                  <button
                    type="button"
                    className={cn(
                      "rounded-full px-3 py-1 font-medium",
                      view === "chart"
                        ? "bg-sky-600 text-white"
                        : "text-muted-foreground",
                    )}
                    onClick={() => setView("chart")}
                  >
                    Biểu đồ
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-full px-3 py-1 font-medium",
                      view === "list"
                        ? "bg-sky-600 text-white"
                        : "text-muted-foreground",
                    )}
                    onClick={() => setView("list")}
                  >
                    Danh sách
                  </button>
                </div>
              </div>

              {view === "chart" ? (
                <div className="mt-2 grid items-center gap-2 sm:grid-cols-[220px_1fr]">
                  <div className="relative mx-auto h-52 w-full max-w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cats}
                          dataKey="amount"
                          nameKey="category"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {cats.map((item) => (
                            <Cell
                              key={item.category}
                              fill={styleFor(item.category, catalog).color}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[11px] text-muted-foreground">
                        Tổng chi tiêu
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(total)}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {cats.map((item) => (
                      <li
                        key={item.category}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{
                              background: styleFor(item.category, catalog).color,
                            }}
                          />
                          <span className="truncate">
                            {categoryLabel(item.category, catalog)}
                          </span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatCurrency(item.amount)}
                          <span className="ml-2 inline-block w-8 text-right">
                            {item.percent.toFixed(0)}%
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-border text-sm">
                  {cats.map((item) => {
                    const style = styleFor(item.category, catalog);
                    const Icon = style.icon;
                    return (
                      <li
                        key={item.category}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              !style.fromApi && style.soft,
                            )}
                            style={
                              style.fromApi
                                ? { backgroundColor: style.color, color: "#fff" }
                                : undefined
                            }
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="truncate">
                            {categoryLabel(item.category, catalog)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right tabular-nums">
                          <span className="font-medium">
                            {formatCurrency(item.amount)}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {item.percent.toFixed(0)}%
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-semibold">Phân bổ theo danh mục</h2>
              <ul className="mt-4 space-y-4">
                {cats.map((item) => {
                  const style = styleFor(item.category, catalog);
                  const Icon = style.icon;
                  return (
                    <li key={item.category}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              !style.fromApi && style.soft,
                            )}
                            style={
                              style.fromApi
                                ? { backgroundColor: style.color, color: "#fff" }
                                : undefined
                            }
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="truncate">
                            {categoryLabel(item.category, catalog)}
                            <span className="text-muted-foreground">
                              {" "}
                              · {item.percent.toFixed(0)}%
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", !style.fromApi && style.bar)}
                          style={{
                            width: `${Math.min(item.percent, 100)}%`,
                            backgroundColor: style.fromApi ? style.color : undefined,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
