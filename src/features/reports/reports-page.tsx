import { useMemo } from "react";
import { EMPTY_ARRAY } from "@/lib/empty";
import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppHeader } from "@/components/layout/app-header";
import {
  EmptyState,
  PageShell,
  StatCard,
} from "@/components/common/status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchLoans, fetchTransactions } from "@/api/endpoints";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  getInterestPaid,
  getPrincipalPaid,
  getRemainingPrincipal,
  groupTransactionsByMonth,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import { getPeriodFromISO } from "@/lib/date";

export function ReportsPage() {
  const { data: bundle } = useAsyncData(async () => {
    const [loans, transactions] = await Promise.all([
      fetchLoans(),
      fetchTransactions(),
    ]);
    return { loans, transactions };
  }, []);

  const loans = bundle?.loans ?? EMPTY_ARRAY;
  const transactions = bundle?.transactions ?? EMPTY_ARRAY;

  const totalDisbursed = transactions
    .filter((t) => t.type === "DISBURSEMENT")
    .reduce((s, t) => s + t.amount, 0);
  const totalPrincipalCollected = getPrincipalPaid(transactions);
  const totalInterestCollected = getInterestPaid(transactions);

  const totalRemaining = loans
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, loan) => {
      const txs = transactions.filter((t) => t.loanId === loan.id);
      return sum + getRemainingPrincipal(loan.principalAmount, txs);
    }, 0);

  const expectedInterest = loans
    .filter((l) => l.status === "ACTIVE")
    .reduce((sum, l) => sum + l.monthlyInterestAmount, 0);

  const activeCount = loans.filter((l) => l.status === "ACTIVE").length;
  const completedCount = loans.filter((l) => l.status === "COMPLETED").length;

  const interestByMonth = groupTransactionsByMonth(
    transactions,
    "INTEREST_PAYMENT",
  );
  const principalByMonth = groupTransactionsByMonth(
    transactions,
    "PRINCIPAL_PAYMENT",
  );

  const monthlyChart = useMemo(() => {
    const periods = [
      ...new Set([
        ...interestByMonth.map((i) => i.period),
        ...principalByMonth.map((p) => p.period),
      ]),
    ].sort();
    return periods.map((period) => ({
      period: format(parseISO(`${period}-01`), "MM/yyyy"),
      interest:
        interestByMonth.find((i) => i.period === period)?.amount ?? 0,
      principal:
        principalByMonth.find((p) => p.period === period)?.amount ?? 0,
    }));
  }, [interestByMonth, principalByMonth]);

  /** Reconstruct remaining principal over time from transaction history. */
  const outstandingOverTime = useMemo(() => {
    const sorted = [...transactions].sort((a, b) =>
      a.transactionDate.localeCompare(b.transactionDate),
    );
    let outstanding = 0;
    const byPeriod = new Map<string, number>();

    for (const tx of sorted) {
      if (tx.type === "DISBURSEMENT") {
        outstanding += tx.amount;
      } else if (tx.type === "PRINCIPAL_PAYMENT") {
        outstanding = Math.max(outstanding - tx.amount, 0);
      }
      const period = getPeriodFromISO(tx.transactionDate);
      byPeriod.set(period, outstanding);
    }

    return [...byPeriod.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({
        period: format(parseISO(`${period}-01`), "MM/yyyy"),
        amount,
      }));
  }, [transactions]);

  return (
    <PageShell
      header={
        <AppHeader
          title="Báo cáo"
          description="Tổng hợp vốn, dư nợ và dòng tiền thu"
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng vốn đã giải ngân"
          value={formatCurrency(totalDisbursed)}
        />
        <StatCard
          title="Tổng gốc đã thu"
          value={formatCurrency(totalPrincipalCollected)}
        />
        <StatCard title="Tổng dư nợ" value={formatCurrency(totalRemaining)} />
        <StatCard
          title="Tổng lời đã thu"
          value={formatCurrency(totalInterestCollected)}
        />
        <StatCard
          title="Lời dự kiến / tháng"
          value={formatCurrency(expectedInterest)}
          hint="Tổng lời/tháng của khoản đang hoạt động"
        />
        <StatCard title="Khoản vay active" value={String(activeCount)} />
        <StatCard title="Khoản vay completed" value={String(completedCount)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lời & gốc thu theo tháng</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyChart.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart}>
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
                      name="Lời thu"
                      fill="var(--chart-2)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="principal"
                      name="Gốc thu"
                      fill="var(--chart-1)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dư nợ theo thời gian</CardTitle>
          </CardHeader>
          <CardContent>
            {outstandingOverTime.length === 0 ? (
              <EmptyState title="Chưa có dữ liệu" />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={outstandingOverTime}>
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
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Dư nợ gốc"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
