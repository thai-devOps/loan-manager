import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { EMPTY_ARRAY } from "@/lib/empty";
import { AppHeader } from "@/components/layout/app-header";
import {
  EmptyState,
  PageShell,
  ScheduleStatusBadge,
} from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
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
import { syncSchedulesForActiveLoans } from "@/features/loans/loan.service";
import {
  getScheduleRemaining,
  resolveScheduleStatus,
} from "@/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import { formatDate, formatPeriod } from "@/lib/date";
import type { InterestScheduleStatus } from "@/types/interest-schedule";

export function SchedulesPage() {
  const [statusFilter, setStatusFilter] = useState<"ALL" | InterestScheduleStatus>(
    "ALL",
  );

  useEffect(() => {
    void syncSchedulesForActiveLoans();
  }, []);

  const borrowers = useLiveQuery(() => db.borrowers.toArray(), []) ?? EMPTY_ARRAY;
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? EMPTY_ARRAY;
  const schedules =
    useLiveQuery(() => db.interestSchedules.toArray(), []) ?? EMPTY_ARRAY;

  const borrowerMap = useMemo(
    () => new Map(borrowers.map((b) => [b.id, b])),
    [borrowers],
  );
  const loanMap = useMemo(
    () => new Map(loans.map((l) => [l.id, l])),
    [loans],
  );

  const rows = useMemo(() => {
    return schedules
      .map((s) => {
        const status = resolveScheduleStatus(s);
        return { ...s, resolvedStatus: status };
      })
      .filter((s) =>
        statusFilter === "ALL" ? true : s.resolvedStatus === statusFilter,
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [schedules, statusFilter]);

  return (
    <PageShell
      header={
        <AppHeader
          title="Lịch thu"
          description="Lịch tiền lời theo tháng"
        />
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as "ALL" | InterestScheduleStatus)
          }
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả</SelectItem>
            <SelectItem value="PENDING">Chưa thu</SelectItem>
            <SelectItem value="PARTIAL">Thu một phần</SelectItem>
            <SelectItem value="OVERDUE">Quá hạn</SelectItem>
            <SelectItem value="PAID">Đã thu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Chưa có lịch thu" />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((s) => {
              const loan = loanMap.get(s.loanId);
              const borrower = loan
                ? borrowerMap.get(loan.borrowerId)
                : undefined;
              return (
                <div key={s.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{borrower?.name ?? "—"}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPeriod(s.period)} · {formatDate(s.dueDate)}
                      </p>
                    </div>
                    <ScheduleStatusBadge status={s.resolvedStatus} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Phải thu</p>
                      <p>{formatCurrency(s.amount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Đã thu</p>
                      <p>{formatCurrency(s.paidAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Còn thiếu</p>
                      <p>{formatCurrency(getScheduleRemaining(s))}</p>
                    </div>
                  </div>
                  {s.resolvedStatus !== "PAID" && loan?.status === "ACTIVE" && (
                    <Button asChild size="sm" className="mt-3 w-full">
                      <Link to={`/payments?loanId=${s.loanId}`}>Thu tiền</Link>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người vay</TableHead>
                  <TableHead>Kỳ</TableHead>
                  <TableHead>Ngày đến hạn</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Đã thu</TableHead>
                  <TableHead>Còn thiếu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => {
                  const loan = loanMap.get(s.loanId);
                  const borrower = loan
                    ? borrowerMap.get(loan.borrowerId)
                    : undefined;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{borrower?.name ?? "—"}</TableCell>
                      <TableCell>{formatPeriod(s.period)}</TableCell>
                      <TableCell>{formatDate(s.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(s.amount)}</TableCell>
                      <TableCell>{formatCurrency(s.paidAmount)}</TableCell>
                      <TableCell>
                        {formatCurrency(getScheduleRemaining(s))}
                      </TableCell>
                      <TableCell>
                        <ScheduleStatusBadge status={s.resolvedStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        {s.resolvedStatus !== "PAID" &&
                        loan?.status === "ACTIVE" ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/payments?loanId=${s.loanId}`}>
                              Thu tiền
                            </Link>
                          </Button>
                        ) : (
                          "—"
                        )}
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
