import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EMPTY_ARRAY } from "@/lib/empty";
import { ArrowDownLeft, Banknote, CircleDollarSign } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { LoansModuleChrome } from "@/features/loans/loans-layout";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import {
  MobileList,
  MobileListCard,
  toneFromTransactionType,
} from "@/components/common/mobile-list-card";
import {
  EmptyState,
  PageShell,
  TransactionTypeBadge,
} from "@/components/common/status-badges";
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
  useBorrowersQuery,
  useLoansQuery,
  useTransactionsQuery,
} from "@/api/queries";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { TransactionType } from "@/types/transaction";

export function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");

  const borrowersQ = useBorrowersQuery();
  const loansQ = useLoansQuery();
  const transactionsQ = useTransactionsQuery();
  const isLoading =
    borrowersQ.isLoading || loansQ.isLoading || transactionsQ.isLoading;

  const borrowers = borrowersQ.data ?? EMPTY_ARRAY;
  const loans = loansQ.data ?? EMPTY_ARRAY;
  const transactions = transactionsQ.data ?? EMPTY_ARRAY;

  const borrowerMap = useMemo(
    () => new Map(borrowers.map((b) => [b.id, b])),
    [borrowers],
  );
  const loanMap = useMemo(
    () => new Map(loans.map((l) => [l.id, l])),
    [loans],
  );

  const rows = useMemo(() => {
    return transactions
      .filter((t) => (typeFilter === "ALL" ? true : t.type === typeFilter))
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [transactions, typeFilter]);

  return (
    <PageShell
      header={
        <AppHeader
          title="Giao dịch"
          description="Lịch sử giao dịch (chỉ xem — không xóa)"
        />
      }
      subNav={<LoansModuleChrome />}
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as "ALL" | TransactionType)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Loại giao dịch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="DISBURSEMENT">Giải ngân</SelectItem>
            <SelectItem value="INTEREST_PAYMENT">Thu lời</SelectItem>
            <SelectItem value="PRINCIPAL_PAYMENT">Thu gốc</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TablePageSkeleton showSearch={false} />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa có giao dịch" />
      ) : (
        <>
          <MobileList>
            {rows.map((tx) => {
              const loan = loanMap.get(tx.loanId);
              const borrower = loan
                ? borrowerMap.get(loan.borrowerId)
                : undefined;
              return (
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
                  title={borrower?.name ?? "—"}
                  subtitle={formatDate(tx.createdAt)}
                  badge={<TransactionTypeBadge type={tx.type} />}
                  primaryValue={formatCurrency(tx.amount)}
                  meta={tx.note || undefined}
                  footer={
                    loan ? (
                      <Link
                        to={`/loans/${loan.id}`}
                        className="text-xs text-info hover:underline"
                      >
                        Xem khoản vay
                      </Link>
                    ) : undefined
                  }
                />
              );
            })}
          </MobileList>

          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Người vay</TableHead>
                  <TableHead>Khoản vay</TableHead>
                  <TableHead>Loại giao dịch</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tx) => {
                  const loan = loanMap.get(tx.loanId);
                  const borrower = loan
                    ? borrowerMap.get(loan.borrowerId)
                    : undefined;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>{borrower?.name ?? "—"}</TableCell>
                      <TableCell>
                        {loan ? (
                          <Link
                            to={`/loans/${loan.id}`}
                            className="hover:underline"
                          >
                            {formatCurrency(loan.principalAmount)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <TransactionTypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {tx.note || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </PageShell>
  );
}
