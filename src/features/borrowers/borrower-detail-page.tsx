import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowDownLeft, Banknote, CircleDollarSign, HandCoins } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { DetailPageSkeleton } from "@/components/common/loading-skeletons";
import {
  MobileList,
  MobileListCard,
  toneFromLoanStatus,
  toneFromTransactionType,
} from "@/components/common/mobile-list-card";
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
  useBorrowerQuery,
  useLoansQuery,
  useTransactionsQuery,
} from "@/api/queries";
import {
  getInterestPaid,
  getRemainingPrincipal,
  getPrincipalPaid,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { EMPTY_ARRAY } from "@/lib/empty";

export function BorrowerDetailPage() {
  const { id = "" } = useParams<{ id: string }>();

  const borrowerQ = useBorrowerQuery(id);
  const loansQ = useLoansQuery();
  const transactionsQ = useTransactionsQuery();

  const isLoading =
    borrowerQ.isLoading || loansQ.isLoading || transactionsQ.isLoading;

  if (isLoading) {
    return (
      <PageShell header={<AppHeader title="Người vay" />}>
        <DetailPageSkeleton />
      </PageShell>
    );
  }

  if (borrowerQ.isError || !borrowerQ.data) {
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

  const borrower = borrowerQ.data;
  const allLoans = loansQ.data ?? EMPTY_ARRAY;
  const allTransactions = transactionsQ.data ?? EMPTY_ARRAY;
  const loans = allLoans.filter((l) => l.borrowerId === id);
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
              <MobileList>
                {loans.map((loan) => {
                  const txs = allTransactions.filter(
                    (t) => t.loanId === loan.id,
                  );
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
                      title={formatCurrency(loan.principalAmount)}
                      badge={<LoanStatusBadge status={loan.status} />}
                      primaryValue={formatCurrency(remaining)}
                      meta={`Bắt đầu ${formatDate(loan.startDate)}`}
                    />
                  );
                })}
              </MobileList>
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
            <>
              <MobileList>
                {transactions.map((tx) => (
                  <MobileListCard
                    key={tx.id}
                    tone={toneFromTransactionType(tx.type)}
                    icon={
                      tx.type === "DISBURSEMENT" ? (
                        <ArrowDownLeft />
                      ) : tx.type === "INTEREST_PAYMENT" ? (
                        <CircleDollarSign />
                      ) : (
                        <Banknote />
                      )
                    }
                    title={formatDate(tx.transactionDate)}
                    badge={<TransactionTypeBadge type={tx.type} />}
                    primaryValue={formatCurrency(tx.amount)}
                    meta={tx.note || undefined}
                  />
                ))}
              </MobileList>
              <div className="hidden overflow-x-auto md:block">
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
            </>
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
