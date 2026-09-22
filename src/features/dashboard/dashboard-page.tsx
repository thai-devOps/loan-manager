import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  HandCoins,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, isSameDay, startOfDay } from "date-fns";
import { AppHeader } from "@/components/layout/app-header";
import { LoansModuleChrome } from "@/features/loans/loans-layout";
import { DashboardSkeleton } from "@/components/common/loading-skeletons";
import {
  CollectMoneyButton,
  MobileList,
  MobileListCard,
  toneFromLoanStatus,
  toneFromScheduleStatus,
} from "@/components/common/mobile-list-card";
import {
  EmptyState,
  LoanStatusBadge,
  PageShell,
  ScheduleStatusBadge,
  StatCard,
} from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBorrowersQuery,
  useLoansQuery,
  useSchedulesQuery,
  useTransactionsQuery,
  useAssetSummaryQuery,
  useGoldPurchasesQuery,
} from "@/api/queries";
import {
  getInterestPaid,
  getPrincipalPaid,
  getRemainingPrincipal,
  getScheduleRemaining,
  groupTransactionsByMonth,
  resolveScheduleStatus,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import { getDaysOverdue } from "@/lib/date";
import { EMPTY_ARRAY } from "@/lib/empty";
import {
  calculateGoldGoalProgress,
  normalizeGoldPlan,
  planAccumulatedPhan,
  planHasQuantityTarget,
} from "@/features/assets/lib/calculations";
import { formatGoldQuantity } from "@/features/assets/lib/gold-units";

export function DashboardPage() {
  const borrowersQ = useBorrowersQuery();
  const loansQ = useLoansQuery();
  const transactionsQ = useTransactionsQuery();
  const schedulesQ = useSchedulesQuery();

  const isLoading =
    borrowersQ.isLoading ||
    loansQ.isLoading ||
    transactionsQ.isLoading ||
    schedulesQ.isLoading;

  const borrowers = borrowersQ.data ?? EMPTY_ARRAY;
  const loans = loansQ.data ?? EMPTY_ARRAY;
  const transactions = transactionsQ.data ?? EMPTY_ARRAY;
  const schedules = schedulesQ.data ?? EMPTY_ARRAY;

  const borrowerMap = useMemo(
    () => new Map(borrowers.map((b) => [b.id, b])),
    [borrowers],
  );

  const txsByLoan = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    for (const tx of transactions) {
      const list = map.get(tx.loanId) ?? [];
      list.push(tx);
      map.set(tx.loanId, list);
    }
    return map;
  }, [transactions]);

  const activeLoans = loans.filter((l) => l.status === "ACTIVE");

  const totalDisbursed = transactions
    .filter((t) => t.type === "DISBURSEMENT")
    .reduce((s, t) => s + t.amount, 0);

  const totalRemaining = activeLoans.reduce((sum, loan) => {
    return (
      sum +
      getRemainingPrincipal(loan.principalAmount, txsByLoan.get(loan.id) ?? [])
    );
  }, 0);

  const totalInterestCollected = getInterestPaid(transactions);

  const dueToCollect = schedules
    .filter((s) => {
      const loan = loans.find((l) => l.id === s.loanId);
      return loan?.status === "ACTIVE" && s.status !== "PAID";
    })
    .reduce((sum, s) => sum + getScheduleRemaining(s), 0);

  const today = startOfDay(new Date());
  const dueToday = schedules.filter((s) => {
    const loan = loans.find((l) => l.id === s.loanId);
    if (!loan || loan.status !== "ACTIVE") return false;
    if (s.status === "PAID") return false;
    return isSameDay(parseISO(s.dueDate), today);
  });

  const overdue = schedules
    .filter((s) => {
      const loan = loans.find((l) => l.id === s.loanId);
      if (!loan || loan.status !== "ACTIVE") return false;
      return resolveScheduleStatus(s) === "OVERDUE" || s.status === "OVERDUE";
    })
    .map((s) => ({
      ...s,
      daysOverdue: getDaysOverdue(s.dueDate),
      borrowerName:
        borrowerMap.get(
          loans.find((l) => l.id === s.loanId)?.borrowerId ?? "",
        )?.name ?? "—",
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const interestByMonth = groupTransactionsByMonth(
    transactions,
    "INTEREST_PAYMENT",
  );
  const principalByMonth = groupTransactionsByMonth(
    transactions,
    "PRINCIPAL_PAYMENT",
  );
  const chartPeriods = [
    ...new Set([
      ...interestByMonth.map((i) => i.period),
      ...principalByMonth.map((p) => p.period),
    ]),
  ].sort();

  const chartData = chartPeriods.map((period) => ({
    period: format(parseISO(`${period}-01`), "MM/yyyy"),
    interest: interestByMonth.find((i) => i.period === period)?.amount ?? 0,
    principal: principalByMonth.find((p) => p.period === period)?.amount ?? 0,
  }));

  return (
    <PageShell
      header={
        <AppHeader
          title="Tổng quan"
          description="Theo dõi vốn cho vay, dư nợ và lịch thu"
        />
      }
      subNav={<LoansModuleChrome />}
    >
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Tổng vốn cho vay"
              value={formatCurrency(totalDisbursed)}
              icon={<Banknote className="size-4" />}
            />
            <StatCard
              title="Tổng dư nợ gốc"
              value={formatCurrency(totalRemaining)}
              icon={<Wallet className="size-4" />}
            />
            <StatCard
              title="Tổng tiền lời đã thu"
              value={formatCurrency(totalInterestCollected)}
              icon={<CircleDollarSign className="size-4" />}
            />
            <StatCard
              title="Tiền cần thu"
              value={formatCurrency(dueToCollect)}
              hint="Lời còn thiếu trên các kỳ chưa đủ"
              icon={<HandCoins className="size-4" />}
            />
          </div>

          <DashboardAssetsWidgets />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Hôm nay cần thu</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to="/payments">Thu tiền</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {dueToday.length === 0 ? (
                  <EmptyState title="Không có khoản nào đến hạn hôm nay" />
                ) : (
                  <div className="space-y-2.5">
                    {dueToday.map((s) => {
                      const loan = loans.find((l) => l.id === s.loanId);
                      const borrower = loan
                        ? borrowerMap.get(loan.borrowerId)
                        : undefined;
                      return (
                        <MobileListCard
                          key={s.id}
                          tone={toneFromScheduleStatus(
                            resolveScheduleStatus(s),
                          )}
                          icon={<CalendarClock />}
                          title={borrower?.name ?? "—"}
                          badge={
                            <ScheduleStatusBadge
                              status={resolveScheduleStatus(s)}
                            />
                          }
                          primaryValue={formatCurrency(
                            getScheduleRemaining(s),
                          )}
                          footer={
                            <CollectMoneyButton
                              loanId={s.loanId}
                              tone={toneFromScheduleStatus(
                                resolveScheduleStatus(s),
                              )}
                            />
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Khoản quá hạn</CardTitle>
              </CardHeader>
              <CardContent>
                {overdue.length === 0 ? (
                  <EmptyState title="Không có khoản quá hạn" />
                ) : (
                  <>
                    <MobileList>
                      {overdue.slice(0, 8).map((s) => (
                        <MobileListCard
                          key={s.id}
                          tone="danger"
                          icon={<AlertTriangle />}
                          title={s.borrowerName}
                          subtitle={`${s.daysOverdue} ngày quá hạn`}
                          primaryValue={formatCurrency(getScheduleRemaining(s))}
                        />
                      ))}
                    </MobileList>
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Người vay</TableHead>
                            <TableHead>Số tiền</TableHead>
                            <TableHead>Quá hạn</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overdue.slice(0, 8).map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>{s.borrowerName}</TableCell>
                              <TableCell>
                                {formatCurrency(getScheduleRemaining(s))}
                              </TableCell>
                              <TableCell>{s.daysOverdue} ngày</TableCell>
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

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                Khoản vay đang hoạt động
              </CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link to="/loans">Xem tất cả</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeLoans.length === 0 ? (
                <EmptyState
                  title="Chưa có khoản vay hoạt động"
                  action={
                    <Button asChild>
                      <Link to="/loans">Tạo khoản vay</Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  <MobileList>
                    {activeLoans.map((loan) => {
                      const txs = txsByLoan.get(loan.id) ?? [];
                      const remaining = getRemainingPrincipal(
                        loan.principalAmount,
                        txs,
                      );
                      return (
                        <MobileListCard
                          key={loan.id}
                          to={`/loans/${loan.id}`}
                          tone={toneFromLoanStatus(loan.status)}
                          icon={<HandCoins />}
                          title={
                            borrowerMap.get(loan.borrowerId)?.name ?? "—"
                          }
                          badge={<LoanStatusBadge status={loan.status} />}
                          primaryValue={formatCurrency(remaining)}
                          meta={`Gốc ${formatCurrency(loan.principalAmount)} · Lời ${formatCurrency(loan.monthlyInterestAmount)}/th`}
                        />
                      );
                    })}
                  </MobileList>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Người vay</TableHead>
                          <TableHead>Gốc ban đầu</TableHead>
                          <TableHead>Đã thu gốc</TableHead>
                          <TableHead>Còn lại</TableHead>
                          <TableHead>Lời/tháng</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeLoans.map((loan) => {
                          const txs = txsByLoan.get(loan.id) ?? [];
                          return (
                            <TableRow key={loan.id}>
                              <TableCell>
                                <Link
                                  to={`/loans/${loan.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {borrowerMap.get(loan.borrowerId)?.name ??
                                    "—"}
                                </Link>
                              </TableCell>
                              <TableCell>
                                {formatCurrency(loan.principalAmount)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(getPrincipalPaid(txs))}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(
                                  getRemainingPrincipal(
                                    loan.principalAmount,
                                    txs,
                                  ),
                                )}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(loan.monthlyInterestAmount)}
                              </TableCell>
                              <TableCell>
                                <LoanStatusBadge status={loan.status} />
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tiền lời & gốc thu theo tháng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <EmptyState title="Chưa có dữ liệu biểu đồ" />
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v: number) =>
                          `${Math.round(v / 1_000_000)}tr`
                        }
                      />
                      <Tooltip
                        formatter={(value) =>
                          formatCurrency(Number(value ?? 0))
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="interest"
                        name="Tiền lời"
                        fill="var(--chart-2)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="principal"
                        name="Tiền gốc"
                        fill="var(--chart-1)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}

function DashboardAssetsWidgets() {
  const summaryQ = useAssetSummaryQuery();
  const purchasesQ = useGoldPurchasesQuery();
  if (summaryQ.isLoading || !summaryQ.data) return null;
  const s = summaryQ.data;
  const purchases = purchasesQ.data ?? EMPTY_ARRAY;
  const plan = s.plan ? normalizeGoldPlan(s.plan) : null;
  const hasQty = plan ? planHasQuantityTarget(plan) : false;
  const progress =
    plan && hasQty
      ? calculateGoldGoalProgress(
          planAccumulatedPhan(plan, purchases),
          plan.targetQuantityInPhan!,
        )
      : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Tài sản</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/assets">Xem tài sản →</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Tổng tài sản</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(s.totalAssets)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Đang cho vay</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(s.lentCapital)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Khả dụng</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(s.availableCash)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Vàng</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(s.goldValue)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Kế hoạch vàng</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/assets/gold-plan">Xem kế hoạch →</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!plan ? (
            <p className="text-sm text-muted-foreground">
              Chưa có kế hoạch tích lũy vàng.
            </p>
          ) : hasQty ? (
            <div className="space-y-2">
              <p className="text-sm font-medium tabular-nums">
                {formatGoldQuantity(planAccumulatedPhan(plan, purchases))} /{" "}
                {formatGoldQuantity(plan.targetQuantityInPhan!)}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-600"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress}% · {formatCurrency(plan.monthlyBudget)} / tháng
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cần cập nhật mục tiêu số lượng vàng để theo dõi tiến độ.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
