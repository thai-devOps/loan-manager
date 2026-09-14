import { AppHeader } from "@/components/layout/app-header";
import {
  EmptyState,
  PageShell,
  StatCard,
} from "@/components/common/status-badges";
import {
  LoanStatusBadge,
  ScheduleStatusBadge,
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
import { db } from "@/db/database";
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
import { syncSchedulesForActiveLoans } from "@/features/loans/loan.service";
import { useLiveQuery } from "dexie-react-hooks";
import { EMPTY_ARRAY } from "@/lib/empty";
import {
  Banknote,
  CircleDollarSign,
  HandCoins,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
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

export function DashboardPage() {
  useEffect(() => {
    void syncSchedulesForActiveLoans();
  }, []);

  const borrowers = useLiveQuery(() => db.borrowers.toArray(), []) ?? EMPTY_ARRAY;
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? EMPTY_ARRAY;
  const transactions =
    useLiveQuery(() => db.transactions.toArray(), []) ?? EMPTY_ARRAY;
  const schedules =
    useLiveQuery(() => db.interestSchedules.toArray(), []) ?? EMPTY_ARRAY;

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
    interest:
      interestByMonth.find((i) => i.period === period)?.amount ?? 0,
    principal:
      principalByMonth.find((p) => p.period === period)?.amount ?? 0,
  }));

  return (
    <PageShell
      header={
        <AppHeader
          title="Tổng quan"
          description="Theo dõi vốn cho vay, dư nợ và lịch thu"
        />
      }
    >
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
              <div className="space-y-3 md:hidden">
                {dueToday.map((s) => {
                  const loan = loans.find((l) => l.id === s.loanId);
                  const borrower = loan
                    ? borrowerMap.get(loan.borrowerId)
                    : undefined;
                  return (
                    <div
                      key={s.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{borrower?.name ?? "—"}</p>
                          <p className="text-muted-foreground">
                            {formatCurrency(s.amount)}
                          </p>
                        </div>
                        <ScheduleStatusBadge
                          status={resolveScheduleStatus(s)}
                        />
                      </div>
                      <Button asChild size="sm" className="mt-3 w-full">
                        <Link to={`/payments?loanId=${s.loanId}`}>Thu tiền</Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {dueToday.length > 0 && (
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người vay</TableHead>
                      <TableHead>Tiền lời</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dueToday.map((s) => {
                      const loan = loans.find((l) => l.id === s.loanId);
                      const borrower = loan
                        ? borrowerMap.get(loan.borrowerId)
                        : undefined;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{borrower?.name ?? "—"}</TableCell>
                          <TableCell>{formatCurrency(s.amount)}</TableCell>
                          <TableCell>
                            <ScheduleStatusBadge
                              status={resolveScheduleStatus(s)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/payments?loanId=${s.loanId}`}>
                                Thu tiền
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
                <div className="space-y-3 md:hidden">
                  {overdue.slice(0, 8).map((s) => (
                    <div key={s.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{s.borrowerName}</p>
                      <p className="text-muted-foreground">
                        {formatCurrency(getScheduleRemaining(s))} ·{" "}
                        {s.daysOverdue} ngày
                      </p>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Người vay</TableHead>
                        <TableHead>Số tiền</TableHead>
                        <TableHead>Số ngày quá hạn</TableHead>
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
          <CardTitle className="text-base">Khoản vay đang hoạt động</CardTitle>
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
              <div className="space-y-3 md:hidden">
                {activeLoans.map((loan) => {
                  const txs = txsByLoan.get(loan.id) ?? [];
                  const remaining = getRemainingPrincipal(
                    loan.principalAmount,
                    txs,
                  );
                  return (
                    <Link
                      key={loan.id}
                      to={`/loans/${loan.id}`}
                      className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">
                          {borrowerMap.get(loan.borrowerId)?.name ?? "—"}
                        </p>
                        <LoanStatusBadge status={loan.status} />
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Dư nợ {formatCurrency(remaining)} · Lời{" "}
                        {formatCurrency(loan.monthlyInterestAmount)}/tháng
                      </p>
                    </Link>
                  );
                })}
              </div>
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
                      const paid = getPrincipalPaid(txs);
                      const remaining = getRemainingPrincipal(
                        loan.principalAmount,
                        txs,
                      );
                      return (
                        <TableRow key={loan.id}>
                          <TableCell>
                            <Link
                              to={`/loans/${loan.id}`}
                              className="font-medium hover:underline"
                            >
                              {borrowerMap.get(loan.borrowerId)?.name ?? "—"}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(loan.principalAmount)}
                          </TableCell>
                          <TableCell>{formatCurrency(paid)}</TableCell>
                          <TableCell>{formatCurrency(remaining)}</TableCell>
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
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
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
    </PageShell>
  );
}
