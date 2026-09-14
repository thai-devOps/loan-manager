import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { EMPTY_ARRAY } from "@/lib/empty";
import { AppHeader } from "@/components/layout/app-header";
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
import { db } from "@/db/database";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { TransactionType } from "@/types/transaction";

export function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");

  const borrowers = useLiveQuery(() => db.borrowers.toArray(), []) ?? EMPTY_ARRAY;
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? EMPTY_ARRAY;
  const transactions =
    useLiveQuery(() => db.transactions.toArray(), []) ?? EMPTY_ARRAY;

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

      {rows.length === 0 ? (
        <EmptyState title="Chưa có giao dịch" />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((tx) => {
              const loan = loanMap.get(tx.loanId);
              const borrower = loan
                ? borrowerMap.get(loan.borrowerId)
                : undefined;
              return (
                <div
                  key={tx.id}
                  className="rounded-xl border bg-card p-4 shadow-sm text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{borrower?.name ?? "—"}</p>
                      <p className="text-muted-foreground">
                        {formatDate(tx.transactionDate)}
                      </p>
                    </div>
                    <TransactionTypeBadge type={tx.type} />
                  </div>
                  <p className="mt-2 text-base font-semibold">
                    {formatCurrency(tx.amount)}
                  </p>
                  {tx.note && (
                    <p className="mt-1 text-muted-foreground">{tx.note}</p>
                  )}
                  {loan && (
                    <Link
                      to={`/loans/${loan.id}`}
                      className="mt-2 inline-block text-xs text-info hover:underline"
                    >
                      Xem khoản vay
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

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
                      <TableCell>{formatDate(tx.transactionDate)}</TableCell>
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
