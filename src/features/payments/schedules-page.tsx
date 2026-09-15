import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EMPTY_ARRAY } from "@/lib/empty";
import { CalendarClock } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { LoansModuleChrome } from "@/features/loans/loans-layout";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import {
  CollectMoneyButton,
  MobileList,
  MobileListCard,
  toneFromScheduleStatus,
} from "@/components/common/mobile-list-card";
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
import {
  useBorrowersQuery,
  useLoansQuery,
  useSchedulesQuery,
} from "@/api/queries";
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

  const borrowersQ = useBorrowersQuery();
  const loansQ = useLoansQuery();
  const schedulesQ = useSchedulesQuery();
  const isLoading =
    borrowersQ.isLoading || loansQ.isLoading || schedulesQ.isLoading;

  const borrowers = borrowersQ.data ?? EMPTY_ARRAY;
  const loans = loansQ.data ?? EMPTY_ARRAY;
  const schedules = schedulesQ.data ?? EMPTY_ARRAY;

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
      subNav={<LoansModuleChrome />}
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

      {isLoading ? (
        <TablePageSkeleton showSearch={false} />
      ) : rows.length === 0 ? (
        <EmptyState title="Chưa có lịch thu" />
      ) : (
        <>
          <MobileList>
            {rows.map((s) => {
              const loan = loanMap.get(s.loanId);
              const borrower = loan
                ? borrowerMap.get(loan.borrowerId)
                : undefined;
              return (
                <MobileListCard
                  key={s.id}
                  tone={toneFromScheduleStatus(s.resolvedStatus)}
                  icon={<CalendarClock />}
                  title={borrower?.name ?? "—"}
                  subtitle={`${formatPeriod(s.period)} · ${formatDate(s.dueDate)}`}
                  badge={<ScheduleStatusBadge status={s.resolvedStatus} />}
                  primaryValue={formatCurrency(getScheduleRemaining(s))}
                  footer={
                    s.resolvedStatus !== "PAID" && loan?.status === "ACTIVE" ? (
                      <CollectMoneyButton
                        loanId={s.loanId}
                        tone={toneFromScheduleStatus(s.resolvedStatus)}
                      />
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
                  <TableHead className="w-28">Thao tác</TableHead>
                  <TableHead>Người vay</TableHead>
                  <TableHead>Kỳ</TableHead>
                  <TableHead>Ngày đến hạn</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Đã thu</TableHead>
                  <TableHead>Còn thiếu</TableHead>
                  <TableHead>Trạng thái</TableHead>
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
                      <TableCell>
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
