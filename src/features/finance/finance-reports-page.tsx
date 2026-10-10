import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  HandCoins,
  Landmark,
  RefreshCw,
  Scale,
  Search,
  Wallet,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import {
  useFinanceCategoriesQuery,
  useFinanceReportCyclesQuery,
  useFinanceReportOverviewQuery,
  useFinanceReportTransactionsQuery,
} from "@/api/queries";
import { EmptyState } from "@/components/common/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker, formatDateDisplay } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/features/auth/can";
import { PERMISSIONS } from "@/config/permissions";
import { PAYMENT_METHODS, categoryLabel, paymentMethodLabel } from "@/features/finance/lib/categories";
import { resolveSalaryCycleRange } from "@/features/finance/lib/date-range";
import {
  SALARY_PAYDAY_OPTIONS,
  getSalaryPayday,
  setSalaryPayday,
} from "@/features/finance/lib/finance-prefs";
import type {
  FinanceReportTransaction,
  ReportSlice,
  SalaryCycleReport,
} from "@/features/finance/lib/report-types";
import type { FinanceCategoryRecord } from "@/types/finance";
import { formatCurrency } from "@/lib/currency";
import { todayDateInput } from "@/lib/date";
import { getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LOAN_INTEREST_CATEGORY,
  REPORT_PRESET_OPTIONS,
  chartGrain,
  regroupDailyPoints,
  resolveReportPreset,
  type ChartGrain,
  type ChartPoint,
  type ReportFilterKind,
  type ReportPreset,
} from "@shared/finance/report-math";

const PAGE_SIZE = 10;
const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const KIND_LABEL: Record<string, string> = {
  income: "Thu",
  expense: "Chi",
  interest: "Lãi cho vay",
  principal: "Thu gốc",
  disbursement: "Giải ngân",
};

const GRAIN_OPTIONS: { value: ChartGrain; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
];

type PagePreset = ReportPreset | "this_salary_cycle" | "last_salary_cycle";

const PERIOD_OPTIONS: { value: PagePreset; label: string }[] = [
  { value: "this_salary_cycle", label: "Chu kỳ lương này" },
  { value: "last_salary_cycle", label: "Chu kỳ lương trước" },
  ...REPORT_PRESET_OPTIONS,
];

function referenceToday(): Date {
  const [year, month, day] = todayDateInput().split("-").map(Number);
  return new Date(year!, (month ?? 1) - 1, day ?? 1);
}

function rangeForPreset(preset: PagePreset, payday: number) {
  const today = todayDateInput();
  if (preset === "this_salary_cycle" || preset === "last_salary_cycle") {
    const cycle = resolveSalaryCycleRange(
      payday,
      referenceToday(),
      preset === "this_salary_cycle" ? "this" : "last",
    );
    if (preset === "this_salary_cycle" && cycle.to > today) return { from: cycle.from, to: today };
    return cycle;
  }
  return resolveReportPreset(preset, today);
}

export function FinanceReportsPage() {
  const queryClient = useQueryClient();
  const [payday, setPayday] = useState(getSalaryPayday);
  const [preset, setPreset] = useState<PagePreset>("this_salary_cycle");
  const [range, setRange] = useState(() =>
    rangeForPreset("this_salary_cycle", getSalaryPayday()),
  );
  const [grain, setGrain] = useState<ChartGrain>("day");
  const [kind, setKind] = useState<ReportFilterKind>("all");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FinanceReportTransaction | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setGrain(chartGrain(range.from, range.to));
  }, [range.from, range.to]);

  const categories = useFinanceCategoriesQuery();
  const overview = useFinanceReportOverviewQuery(range.from, range.to);
  const transactions = useFinanceReportTransactionsQuery({
    from: range.from,
    to: range.to,
    kind,
    category: category || undefined,
    paymentMethod: paymentMethod || undefined,
    q: debouncedQ || undefined,
    sort,
    dir,
    page,
    pageSize: PAGE_SIZE,
  });

  const chartPoints = useMemo(
    () => regroupDailyPoints(overview.data?.daily ?? overview.data?.series.points ?? [], grain),
    [overview.data, grain],
  );

  function applyPreset(next: PagePreset) {
    setPreset(next);
    if (next !== "custom") setRange(rangeForPreset(next, payday));
    setPage(1);
  }

  function focus(nextKind: ReportFilterKind, nextCategory = "") {
    setKind(nextKind);
    setCategory(nextCategory);
    setPage(1);
  }

  function toggleSort(next: "date" | "amount") {
    if (sort === next) setDir((value) => (value === "asc" ? "desc" : "asc"));
    else setSort(next);
    setPage(1);
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["finance", "report"] });
  }

  async function exportCsv() {
    setExportError(null);
    const sp = new URLSearchParams({
      section: "export",
      from: range.from,
      to: range.to,
      sort,
      dir,
    });
    if (kind !== "all") sp.set("kind", kind);
    if (category) sp.set("category", category);
    if (paymentMethod) sp.set("paymentMethod", paymentMethod);
    if (debouncedQ) sp.set("q", debouncedQ);
    const session = getSession();
    const res = await fetch(`/api/finance/reports?${sp.toString()}`, {
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setExportError(body.error ?? "Không xuất được báo cáo");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bao-cao-${range.from}-${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const data = overview.data;
  const expenseSlices = withOther(data?.expenses ?? []);
  const catalog = categories.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Báo cáo tài chính</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi dòng tiền và sức khỏe tài chính của bạn.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <DatePicker
            id="report-from"
            value={range.from}
            max={range.to}
            onChange={(from) => {
              setPreset("custom");
              setRange(resolveReportPreset("custom", todayDateInput(), { from, to: range.to }));
              setPage(1);
            }}
            className="h-9 w-full sm:w-auto"
          />
          <DatePicker
            id="report-to"
            value={range.to}
            min={range.from}
            onChange={(to) => {
              setPreset("custom");
              setRange(resolveReportPreset("custom", todayDateInput(), { from: range.from, to }));
              setPage(1);
            }}
            className="h-9 w-full sm:w-auto"
          />
          <Select value={preset} onValueChange={(value) => applyPreset(value as PagePreset)}>
            <SelectTrigger aria-label="Kỳ báo cáo" className="col-span-2 h-9 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label="Làm mới" onClick={() => void refresh()}>
            <RefreshCw className="size-4" />
          </Button>
          <Can permission={PERMISSIONS.FINANCE_TRANSACTION_EXPORT}>
            <Button type="button" size="sm" className="col-span-2 h-9 sm:col-span-1" onClick={() => void exportCsv()}>
              <Download className="size-4" />
              Xuất báo cáo
            </Button>
          </Can>
        </div>
      </div>
      {exportError ? <p className="text-sm text-destructive">{exportError}</p> : null}

      <SalaryCyclesCard
        payday={payday}
        selectedFrom={range.from}
        selectedTo={range.to}
        onPayday={(day) => {
          const next = setSalaryPayday(day);
          setPayday(next);
          if (preset === "this_salary_cycle" || preset === "last_salary_cycle") {
            setRange(rangeForPreset(preset, next));
            setPage(1);
          }
        }}
        onSelect={(from, to) => {
          setPreset("custom");
          setRange({ from, to });
          setPage(1);
        }}
      />

      {overview.isLoading ? (
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : overview.isError ? (
        <EmptyState
          title="Không tải được báo cáo"
          description={overview.error instanceof Error ? overview.error.message : "Thử lại sau."}
          action={
            <Button type="button" variant="outline" onClick={() => void overview.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
            <KpiButton
              title="Tổng thu vào"
              amount={data.summary.cashIn}
              percent={data.comparison.cashIn.percent}
              label={data.comparison.cashIn.label}
              pressed={kind === "cash_in" && !category}
              tone="in"
              icon={<ArrowDownLeft className="size-4" />}
              onClick={() => focus("cash_in")}
            />
            <KpiButton
              title="Tổng chi ra"
              amount={data.summary.cashOut}
              percent={data.comparison.cashOut.percent}
              label={data.comparison.cashOut.label}
              pressed={kind === "cash_out" && !category}
              tone="out"
              icon={<ArrowUpRight className="size-4" />}
              onClick={() => focus("cash_out")}
            />
            <KpiButton
              title="Dòng tiền ròng"
              amount={data.summary.netCash}
              percent={data.comparison.netCash.percent}
              label={data.comparison.netCash.label}
              pressed={kind === "all" && !category}
              tone="net"
              icon={<Scale className="size-4" />}
              onClick={() => focus("all")}
            />
            <KpiButton
              title="Thu lãi cho vay"
              amount={data.summary.interestIncome}
              percent={data.comparison.interestIncome.percent}
              label={data.comparison.interestIncome.label}
              pressed={kind === "interest"}
              tone="interest"
              icon={<HandCoins className="size-4" />}
              onClick={() => focus("interest")}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Dòng tiền theo thời gian</CardTitle>
                <div className="flex w-fit rounded-full bg-muted p-0.5">
                  {GRAIN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1 text-xs",
                        grain === option.value
                          ? "bg-background font-medium shadow-sm"
                          : "text-muted-foreground",
                      )}
                      onClick={() => setGrain(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {chartPoints.every((point) => point.cashIn === 0 && point.cashOut === 0) ? (
                  <EmptyState title="Chưa có giao dịch trong kỳ này" />
                ) : (
                  <>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartPoints}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            width={48}
                            tickFormatter={(value) =>
                              new Intl.NumberFormat("vi-VN", {
                                notation: "compact",
                                compactDisplay: "short",
                              }).format(Number(value))
                            }
                          />
                          <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                          <Legend />
                          <Bar dataKey="cashIn" name="Thu vào" fill="var(--color-success)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                          <Bar dataKey="cashOut" name="Chi ra" fill="var(--color-destructive)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                          <Line dataKey="netCash" name="Dòng tiền ròng" stroke="var(--color-foreground)" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <EmptyTailNote points={chartPoints} grain={grain} />
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4 xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cơ cấu chi tiêu</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenseSlices.length === 0 ? (
                    <EmptyState title="Chưa có chi tiêu trong kỳ" />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                      <div className="relative h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expenseSlices}
                              dataKey="amount"
                              nameKey="label"
                              innerRadius={46}
                              outerRadius={68}
                              onClick={(_, index) => {
                                const row = expenseSlices[index];
                                if (row && row.category !== "__other") focus("expense", row.category);
                              }}
                            >
                              {expenseSlices.map((row, index) => (
                                <Cell key={row.category} fill={sliceColor(row.category, index, catalog)} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
                          <span className="text-xs font-semibold tabular-nums">
                            {formatCurrency(data.summary.actualExpense)}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="text-left text-muted-foreground">
                            <tr>
                              <th className="py-1 font-medium">Danh mục</th>
                              <th className="py-1 text-right font-medium">Số tiền</th>
                              <th className="py-1 text-right font-medium">Tỷ lệ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenseSlices.map((row, index) => (
                              <tr key={row.category}>
                                <td className="py-1 pr-2">
                                  <button
                                    type="button"
                                    className="flex max-w-full items-center gap-1.5 text-left"
                                    onClick={() => {
                                      if (row.category !== "__other") focus("expense", row.category);
                                    }}
                                  >
                                    <span
                                      className="size-2 shrink-0 rounded-full"
                                      style={{ background: sliceColor(row.category, index, catalog) }}
                                    />
                                    <span className="truncate">{row.label}</span>
                                  </button>
                                </td>
                                <td className="py-1 text-right tabular-nums">{formatCurrency(row.amount)}</td>
                                <td className="py-1 text-right tabular-nums text-muted-foreground">
                                  {row.percent.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Nguồn thu</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.income.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-sm font-medium">Chưa có nguồn thu trong kỳ</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Bạn có thể thêm tiền nhập từ lương, kinh doanh hoặc các nguồn khác.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {data.income.map((row, index) => (
                        <li key={row.category}>
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-3 text-left"
                            onClick={() =>
                              focus(
                                row.category === LOAN_INTEREST_CATEGORY ? "interest" : "income",
                                row.category === LOAN_INTEREST_CATEGORY ? "" : row.category,
                              )
                            }
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ background: sliceColor(row.category, index, catalog) }}
                              />
                              <span className="truncate">{row.label}</span>
                            </span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {formatCurrency(row.amount)} · {row.percent.toFixed(1)}%
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {data.loans ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Báo cáo khoản vay</CardTitle>
                  <Link to="/loans" className="text-xs text-primary hover:underline">
                    Xem tất cả
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniButton label="Đã giải ngân trong kỳ" amount={data.loans.disbursed} onClick={() => focus("disbursement")} />
                    <MiniButton label="Gốc đã thu" amount={data.loans.principalCollected} onClick={() => focus("principal")} />
                    <MiniButton label="Lãi đã thu" amount={data.loans.interestCollected} onClick={() => focus("interest")} />
                    <MiniStat label="Dư nợ gốc" amount={data.loans.outstanding} />
                  </div>
                  <UpcomingLoan loans={data.loans} />
                </CardContent>
              </Card>
            ) : null}

            {data.assets ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tài sản hiện có</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <AssetCell icon={<Wallet className="size-4" />} label="Tiền mặt / Ngân hàng" amount={data.assets.cash} />
                    <AssetCell icon={<Landmark className="size-4" />} label={data.assets.goldBasis === "reference" ? "Vàng (tham chiếu)" : "Vàng (giá vốn)"} amount={data.assets.gold} />
                    <AssetCell icon={<Scale className="size-4" />} label="Tài sản khác" amount={data.assets.other} />
                    <AssetCell icon={<HandCoins className="size-4" />} label="Khoản cho vay (phải thu)" amount={data.assets.lentCapital} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.assets.goldBasis === "reference"
                      ? "Giá vàng lấy từ giá tham chiếu. Chưa trừ các khoản nợ phải trả."
                      : "Vàng đang tính theo giá vốn vì chưa có giá tham chiếu. Chưa trừ các khoản nợ phải trả."}
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Tổng kết kỳ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.narrative.length === 0 ? (
                  <p className="text-muted-foreground">Chưa đủ dữ liệu để nhận xét kỳ này.</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5">
                    {data.narrative.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Tình hình tài chính</p>
                  <MoneyLine label="Số dư đầu kỳ" text="—" />
                  <MoneyLine label="Tổng thu vào" amount={data.summary.cashIn} />
                  <MoneyLine label="Tổng chi ra" amount={data.summary.cashOut} />
                  <MoneyLine label="Dòng tiền ròng" amount={data.summary.netCash} emphasize />
                  <MoneyLine label="Thu nhập thực tế" amount={data.summary.actualIncome} />
                  <MoneyLine label="Số dư cuối kỳ" text="Chưa đủ dữ liệu" />
                </div>
              </CardContent>
            </Card>
            <div className="xl:col-span-3">
              <TransactionPanel
                q={q}
                kind={kind}
                category={category}
                paymentMethod={paymentMethod}
                catalog={catalog}
                page={page}
                transactions={transactions}
                onQuery={(value) => {
                  setQ(value);
                  setPage(1);
                }}
                onKind={(value) => {
                  setKind(value);
                  setPage(1);
                }}
                onCategory={(value) => {
                  setCategory(value);
                  setPage(1);
                }}
                onMethod={(value) => {
                  setPaymentMethod(value);
                  setPage(1);
                }}
                onSort={toggleSort}
                onPage={setPage}
                onOpen={setSelected}
              />
            </div>
          </div>
        </>
      ) : null}

      {data ? null : (
        <TransactionPanel
          q={q}
          kind={kind}
          category={category}
          paymentMethod={paymentMethod}
          catalog={catalog}
          page={page}
          transactions={transactions}
          onQuery={(value) => {
            setQ(value);
            setPage(1);
          }}
          onKind={(value) => {
            setKind(value);
            setPage(1);
          }}
          onCategory={(value) => {
            setCategory(value);
            setPage(1);
          }}
          onMethod={(value) => {
            setPaymentMethod(value);
            setPage(1);
          }}
          onSort={toggleSort}
          onPage={setPage}
          onOpen={setSelected}
        />
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selected?.description || "Giao dịch"}</SheetTitle>
            <SheetDescription>
              {selected ? `${formatDateDisplay(selected.date)} · ${KIND_LABEL[selected.kind] ?? selected.kind}` : ""}
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="space-y-3 px-4 text-sm">
              <p className="text-lg font-semibold tabular-nums">{formatCurrency(selected.amount)}</p>
              <p>Danh mục: {categoryText(selected, catalog)}</p>
              <p>Phương thức: {paymentMethodLabel(selected.paymentMethod)}</p>
              {selected.note ? <p>Ghi chú: {selected.note}</p> : null}
              {selected.loanId ? (
                <Link className="text-primary hover:underline" to={`/loans/${selected.loanId}`}>
                  Mở khoản vay {selected.borrowerName ?? ""}
                </Link>
              ) : null}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TransactionPanel({
  q,
  kind,
  category,
  paymentMethod,
  catalog,
  page,
  transactions,
  onQuery,
  onKind,
  onCategory,
  onMethod,
  onSort,
  onPage,
  onOpen,
}: {
  q: string;
  kind: ReportFilterKind;
  category: string;
  paymentMethod: string;
  catalog: FinanceCategoryRecord[] | undefined;
  page: number;
  transactions: ReturnType<typeof useFinanceReportTransactionsQuery>;
  onQuery: (value: string) => void;
  onKind: (value: ReportFilterKind) => void;
  onCategory: (value: string) => void;
  onMethod: (value: string) => void;
  onSort: (value: "date" | "amount") => void;
  onPage: (value: number) => void;
  onOpen: (row: FinanceReportTransaction) => void;
}) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="text-base">Giao dịch trong kỳ</CardTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative sm:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Tìm kiếm nội dung"
              aria-label="Tìm nội dung"
              className="pl-8"
            />
          </div>
          <Select value={kind} onValueChange={(value) => onKind(value as ReportFilterKind)}>
            <SelectTrigger aria-label="Loại giao dịch" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="cash_in">Tiền thu vào</SelectItem>
              <SelectItem value="cash_out">Tiền chi ra</SelectItem>
              <SelectItem value="actual_income">Thu nhập thực tế</SelectItem>
              <SelectItem value="income">Thu</SelectItem>
              <SelectItem value="expense">Chi</SelectItem>
              <SelectItem value="interest">Lãi cho vay</SelectItem>
              <SelectItem value="principal">Thu gốc</SelectItem>
              <SelectItem value="disbursement">Giải ngân</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category || "all"} onValueChange={(value) => onCategory(value === "all" ? "" : value)}>
            <SelectTrigger aria-label="Danh mục" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              {(catalog ?? []).map((row) => (
                <SelectItem key={row.id} value={row.key}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentMethod || "all"} onValueChange={(value) => onMethod(value === "all" ? "" : value)}>
            <SelectTrigger aria-label="Phương thức" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phương thức</SelectItem>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : transactions.isError ? (
          <EmptyState
            title="Không tải được giao dịch"
            action={
              <Button type="button" variant="outline" onClick={() => void transactions.refetch()}>
                Thử lại
              </Button>
            }
          />
        ) : transactions.data && transactions.data.total === 0 ? (
          <EmptyState title="Không có giao dịch khớp bộ lọc" />
        ) : transactions.data ? (
          <>
            <div className="space-y-2 md:hidden">
              {transactions.data.rows.map((row) => (
                <button
                  key={`${row.source}-${row.id}`}
                  type="button"
                  className="w-full rounded-lg border p-3 text-left"
                  onClick={() => onOpen(row)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.description || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateDisplay(row.date)} · {categoryText(row, catalog)}
                      </p>
                    </div>
                    <p className={cn("shrink-0 text-sm tabular-nums", amountClass(row.kind))}>
                      {formatCurrency(row.amount)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">
                      <button type="button" onClick={() => onSort("date")}>Ngày</button>
                    </th>
                    <th className="py-2 pr-3 font-medium">Nội dung</th>
                    <th className="py-2 pr-3 font-medium">Danh mục</th>
                    <th className="py-2 pr-3 font-medium">Loại</th>
                    <th className="py-2 pr-3 font-medium">Phương thức</th>
                    <th className="py-2 text-right font-medium">
                      <button type="button" onClick={() => onSort("amount")}>Số tiền</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.data.rows.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="border-t">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDateDisplay(row.date)}</td>
                      <td className="max-w-48 py-2 pr-3">
                        <button type="button" className="truncate text-left hover:underline" onClick={() => onOpen(row)}>
                          {row.description || "—"}
                        </button>
                        {row.loanId ? (
                          <Link className="mt-0.5 block text-xs text-primary hover:underline" to={`/loans/${row.loanId}`}>
                            {row.borrowerName ?? "Khoản vay"}
                          </Link>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">
                        <CategoryPill row={row} catalog={catalog} />
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={row.kind === "expense" || row.kind === "disbursement" ? "destructive" : "success"}>
                          {KIND_LABEL[row.kind] ?? row.kind}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{paymentMethodLabel(row.paymentMethod)}</td>
                      <td className={cn("py-2 text-right tabular-nums", amountClass(row.kind))}>
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {transactions.data.total} giao dịch
              </span>
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                  Trước
                </Button>
                {Array.from({ length: transactions.data.pages }, (_, index) => index + 1)
                  .filter((number) => transactions.data!.pages <= 5 || Math.abs(number - page) <= 1 || number === 1 || number === transactions.data!.pages)
                  .map((number) => (
                    <Button
                      key={number}
                      type="button"
                      variant={number === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPage(number)}
                    >
                      {number}
                    </Button>
                  ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= transactions.data.pages}
                  onClick={() => onPage(page + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function categoryText(row: FinanceReportTransaction, catalog?: FinanceCategoryRecord[]): string {
  if (row.kind === "interest") return "Lãi cho vay";
  if (row.kind === "principal") return "Thu gốc";
  if (row.kind === "disbursement") return "Giải ngân";
  return row.category ? categoryLabel(row.category, catalog) : "—";
}

function cycleMoney(value: number | null): string {
  return value == null ? "—" : formatCurrency(value);
}

function netClass(value: number): string {
  if (value < 0) return "text-rose-600";
  if (value > 0) return "text-emerald-600";
  return "";
}

function SalaryCyclesCard({
  payday,
  selectedFrom,
  selectedTo,
  onPayday,
  onSelect,
}: {
  payday: number;
  selectedFrom: string;
  selectedTo: string;
  onPayday: (day: number) => void;
  onSelect: (from: string, to: string) => void;
}) {
  const cycles = useFinanceReportCyclesQuery(payday);
  const report = cycles.data;

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-base">Theo chu kỳ lương</CardTitle>
          <p className="text-sm text-muted-foreground">
            Thu gồm lương, lãi và gốc đã thu. Chi là chi tiêu sinh hoạt, không gồm giải ngân. Thu khoản vay đã nằm trong cột Thu.
          </p>
        </div>
        <Select value={String(payday)} onValueChange={(value) => onPayday(Number(value))}>
          <SelectTrigger aria-label="Ngày lĩnh lương" className="h-9 w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SALARY_PAYDAY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {cycles.isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : cycles.isError ? (
          <EmptyState
            title="Không tải được chu kỳ lương"
            description={cycles.error instanceof Error ? cycles.error.message : "Thử lại sau."}
            action={
              <Button type="button" variant="outline" onClick={() => void cycles.refetch()}>
                Thử lại
              </Button>
            }
          />
        ) : report && report.cycles.length === 0 ? (
          <EmptyState title="Chưa có giao dịch trong chu kỳ lương nào" />
        ) : report ? (
          <SalaryCycleList
            report={report}
            selectedFrom={selectedFrom}
            selectedTo={selectedTo}
            onSelect={onSelect}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function SalaryCycleList({
  report,
  selectedFrom,
  selectedTo,
  onSelect,
}: {
  report: SalaryCycleReport;
  selectedFrom: string;
  selectedTo: string;
  onSelect: (from: string, to: string) => void;
}) {
  return (
    <>
      <div className="space-y-2 md:hidden">
        {report.cycles.map((cycle) => (
          <button
            key={cycle.from}
            type="button"
            className={cn(
              "w-full rounded-lg border p-3 text-left",
              selectedFrom === cycle.from && selectedTo === cycle.to && "border-primary bg-muted/40",
            )}
            onClick={() => onSelect(cycle.from, cycle.to)}
          >
            <p className="font-medium">{cycle.label}</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Thu</dt>
                <dd className="tabular-nums">{cycleMoney(cycle.cashIn)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Chi</dt>
                <dd className="tabular-nums">{cycleMoney(cycle.cashOut)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Còn lại</dt>
                <dd className={cn("tabular-nums", netClass(cycle.netCash))}>{cycleMoney(cycle.netCash)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Thu khoản vay</dt>
                <dd className="tabular-nums">{cycleMoney(cycle.loanCollected)}</dd>
              </div>
            </dl>
          </button>
        ))}
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="font-medium">Tổng</p>
          <dl className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <dt className="text-muted-foreground">Thu</dt>
              <dd className="tabular-nums">{cycleMoney(report.totals.cashIn)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Chi</dt>
              <dd className="tabular-nums">{cycleMoney(report.totals.cashOut)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Còn lại</dt>
              <dd className={cn("tabular-nums", netClass(report.totals.netCash))}>{cycleMoney(report.totals.netCash)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Thu khoản vay</dt>
              <dd className="tabular-nums">{cycleMoney(report.totals.loanCollected)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Chu kỳ</th>
              <th className="py-2 pr-3 text-right font-medium">Thu</th>
              <th className="py-2 pr-3 text-right font-medium">Chi</th>
              <th className="py-2 pr-3 text-right font-medium">Còn lại</th>
              <th className="py-2 text-right font-medium">Thu khoản vay</th>
            </tr>
          </thead>
          <tbody>
            {report.cycles.map((cycle) => {
              const selected = selectedFrom === cycle.from && selectedTo === cycle.to;
              return (
                <tr key={cycle.from} className={cn("border-t", selected && "bg-muted/40")}>
                  <td className="py-2 pr-3">
                    <button type="button" className="text-left hover:underline" onClick={() => onSelect(cycle.from, cycle.to)}>
                      {cycle.label}
                    </button>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{cycleMoney(cycle.cashIn)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{cycleMoney(cycle.cashOut)}</td>
                  <td className={cn("py-2 pr-3 text-right tabular-nums", netClass(cycle.netCash))}>
                    {cycleMoney(cycle.netCash)}
                  </td>
                  <td className="py-2 text-right tabular-nums">{cycleMoney(cycle.loanCollected)}</td>
                </tr>
              );
            })}
            <tr className="border-t font-medium">
              <td className="py-2 pr-3">Tổng</td>
              <td className="py-2 pr-3 text-right tabular-nums">{cycleMoney(report.totals.cashIn)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{cycleMoney(report.totals.cashOut)}</td>
              <td className={cn("py-2 pr-3 text-right tabular-nums", netClass(report.totals.netCash))}>
                {cycleMoney(report.totals.netCash)}
              </td>
              <td className="py-2 text-right tabular-nums">{cycleMoney(report.totals.loanCollected)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function amountClass(kind: string): string {
  return kind === "expense" || kind === "disbursement" ? "text-rose-600" : "text-emerald-600";
}

function CategoryPill({
  row,
  catalog,
}: {
  row: FinanceReportTransaction;
  catalog?: FinanceCategoryRecord[];
}) {
  const match = catalog?.find((item) => item.key === row.category);
  const color = match?.color;
  return (
    <span
      className="inline-flex max-w-32 truncate rounded-full px-2 py-0.5 text-xs"
      style={color ? { background: `${color}22`, color } : undefined}
    >
      {categoryText(row, catalog)}
    </span>
  );
}

function sliceColor(category: string, index: number, catalog?: FinanceCategoryRecord[]): string {
  if (category === "__other") return "var(--color-muted-foreground)";
  return catalog?.find((item) => item.key === category)?.color ?? PIE_COLORS[index % PIE_COLORS.length]!;
}

function withOther(rows: ReportSlice[]): ReportSlice[] {
  if (rows.length <= 6) return rows;
  const head = rows.slice(0, 5);
  const tail = rows.slice(5);
  const amount = tail.reduce((sum, row) => sum + row.amount, 0);
  const percent = tail.reduce((sum, row) => sum + row.percent, 0);
  return [...head, { category: "__other", label: "Khác", amount, percent }];
}

function deltaText(percent: number | null, label: string): string {
  if (percent === null || percent === 0) return "—";
  return label.replace(" so với kỳ trước", "");
}

function KpiButton({
  title,
  amount,
  label,
  percent,
  pressed,
  tone,
  icon,
  onClick,
}: {
  title: string;
  amount: number;
  label: string;
  percent: number | null;
  pressed: boolean;
  tone: "in" | "out" | "net" | "interest";
  icon: ReactNode;
  onClick: () => void;
}) {
  const toneClass = {
    in: "bg-emerald-500/10 text-emerald-600",
    out: "bg-rose-500/10 text-rose-600",
    net: "bg-sky-500/10 text-sky-600",
    interest: "bg-violet-500/10 text-violet-600",
  }[tone];
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn("rounded-xl border bg-card p-4 text-left", pressed && "border-foreground")}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={cn("flex size-7 items-center justify-center rounded-full", toneClass)}>{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl">{formatCurrency(amount)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        So với kỳ trước{" "}
        <span className={percent !== null && percent !== 0 ? (percent > 0 ? "text-emerald-600" : "text-rose-600") : undefined}>
          {deltaText(percent, label)}
        </span>
      </p>
    </button>
  );
}

function MiniButton({ label, amount, onClick }: { label: string; amount: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border p-3 text-left hover:bg-muted/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{formatCurrency(amount)}</p>
    </button>
  );
}

function MiniStat({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{formatCurrency(amount)}</p>
    </div>
  );
}

function AssetCell({ icon, label, amount }: { icon: ReactNode; label: string; amount: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 font-semibold tabular-nums">{formatCurrency(amount)}</p>
    </div>
  );
}

function MoneyLine({ label, amount, text, emphasize }: { label: string; amount?: number; text?: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", emphasize && "font-semibold")}>{text ?? formatCurrency(amount ?? 0)}</span>
    </div>
  );
}

function UpcomingLoan({
  loans,
}: {
  loans: {
    overdue: { loanId: string; borrowerName: string; dueDate?: string; remaining?: number }[];
    upcoming: { loanId: string; borrowerName: string; dueDate?: string; remaining?: number }[];
  };
}) {
  const row = loans.overdue[0] ?? loans.upcoming[0];
  if (!row) return <p className="text-xs text-muted-foreground">Không có khoản sắp đến hạn.</p>;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
      <Link className="min-w-0 truncate hover:underline" to={`/loans/${row.loanId}`}>
        {row.borrowerName}
        {row.dueDate ? ` · ${formatDateDisplay(row.dueDate)}` : ""}
        {row.remaining !== undefined ? ` · ${formatCurrency(row.remaining)}` : ""}
      </Link>
    </div>
  );
}

function EmptyTailNote({ points, grain }: { points: ChartPoint[]; grain: ChartGrain }) {
  if (grain !== "day") return null;
  let lastFilled = -1;
  points.forEach((point, index) => {
    if (point.cashIn !== 0 || point.cashOut !== 0) lastFilled = index;
  });
  if (lastFilled < 0 || lastFilled >= points.length - 1) return null;
  const start = points[lastFilled + 1];
  const end = points[points.length - 1];
  if (!start || !end) return null;
  return (
    <p className="mt-2 text-right text-xs text-muted-foreground">
      Từ {start.label} – {end.label}: không có giao dịch
    </p>
  );
}
