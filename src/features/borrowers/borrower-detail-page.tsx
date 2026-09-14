import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import {
  EmptyState,
  LoanStatusBadge,
  PageShell,
  StatCard,
  TransactionTypeBadge,
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
  fetchBorrower,
  fetchLoans,
  fetchTransactions,
} from "@/api/endpoints";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  getInterestPaid,
  getRemainingPrincipal,
  getPrincipalPaid,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";

export function BorrowerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: bundle, loading, error } = useAsyncData(async () => {
    if (!id) return null;
    const [borrower, allLoans, allTransactions] = await Promise.all([
      fetchBorrower(id),
      fetchLoans(),
      fetchTransactions(),
    ]);
    const loans = allLoans.filter((l) => l.borrowerId === id);
    return { borrower, loans, allTransactions };
  }, [id]);

  if (loading && !bundle) {
    return (
      <PageShell header={<AppHeader title="Người vay" />}>
        <EmptyState title="Đang tải..." />
      </PageShell>
    );
  }

  if (error || !bundle?.borrower) {
    return (
      <PageShell header={<AppHeader title="Người vay" />}>
        <EmptyState
          title="Không tìm thấy người vay"
          action={
            <Button asChild variant="outline">
              <Link to="/borrowers">Quay lại</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const { borrower, loans, allTransactions } = bundle;
  const loanIds = new Set(loans.map((l) => l.id));
  const transactions = allTransactions
    .filter((t) => loanIds.has(t.loanId))
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  const totalRemaining = loans.reduce((sum, loan) => {
    const txs = allTransactions.filter((t) => t.loanId === loan.id);
    return sum + getRemainingPrincipal(loan.principalAmount, txs);
  }, 0);

  const totalInterest = getInterestPaid(transactions);

  return (
    <PageShell
      header={
        <AppHeader
          title={borrower.name}
          description="Chi tiết người vay"
          actions={
            <Button asChild variant="outline">
              <Link to="/borrowers">
                <ArrowLeft className="size-4" />
                Quay lại
              </Link>
            </Button>
          }
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Tổng dư nợ" value={formatCurrency(totalRemaining)} />
        <StatCard
          title="Tổng lời đã thu"
          value={formatCurrency(totalInterest)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <InfoItem label="Họ tên" value={borrower.name} />
          <InfoItem label="Số điện thoại" value={borrower.phone || "—"} />
          <InfoItem label="CCCD/CMND" value={borrower.identityNumber || "—"} />
          <InfoItem label="Địa chỉ" value={borrower.address || "—"} />
          <InfoItem label="Ghi chú" value={borrower.note || "—"} />
          <InfoItem
            label="Ngày tạo"
            value={formatDate(borrower.createdAt)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Danh sách khoản vay</CardTitle>
          <Button asChild size="sm">
            <Link to={`/loans?borrowerId=${borrower.id}`}>Tạo khoản vay</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <EmptyState title="Chưa có khoản vay" />
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {loans.map((loan) => {
                  const txs = allTransactions.filter(
                    (t) => t.loanId === loan.id,
                  );
                  const remaining = getRemainingPrincipal(
                    loan.principalAmount,
                    txs,
                  );
                  return (
                    <Link
                      key={loan.id}
                      to={`/loans/${loan.id}`}
                      className="block rounded-lg border p-3 text-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <p className="font-medium">
                          {formatCurrency(loan.principalAmount)}
                        </p>
                        <LoanStatusBadge status={loan.status} />
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Dư nợ {formatCurrency(remaining)} · Bắt đầu{" "}
                        {formatDate(loan.startDate)}
                      </p>
                    </Link>
                  );
                })}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Gốc ban đầu</TableHead>
                      <TableHead>Đã thu gốc</TableHead>
                      <TableHead>Dư nợ</TableHead>
                      <TableHead>Lời/tháng</TableHead>
                      <TableHead>Ngày bắt đầu</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((loan) => {
                      const txs = allTransactions.filter(
                        (t) => t.loanId === loan.id,
                      );
                      return (
                        <TableRow key={loan.id}>
                          <TableCell>
                            <Link
                              to={`/loans/${loan.id}`}
                              className="font-medium hover:underline"
                            >
                              {formatCurrency(loan.principalAmount)}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(getPrincipalPaid(txs))}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              getRemainingPrincipal(loan.principalAmount, txs),
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(loan.monthlyInterestAmount)}
                          </TableCell>
                          <TableCell>{formatDate(loan.startDate)}</TableCell>
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
          <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <EmptyState title="Chưa có giao dịch" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                      <TableCell>
                        <TransactionTypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
