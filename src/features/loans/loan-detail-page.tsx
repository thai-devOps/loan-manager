import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EMPTY_ARRAY } from "@/lib/empty";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import {
  EmptyState,
  LoanStatusBadge,
  PageShell,
  ScheduleStatusBadge,
  StatCard,
  TransactionTypeBadge,
} from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchLoanDetail } from "@/api/endpoints";
import {
  cancelLoan,
  recordCombinedPayment,
  recordInterestPayment,
  recordPrincipalPayment,
} from "@/features/loans/loan.service";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  getCurrentInterestSchedule,
  getInterestPaid,
  getPrincipalPaid,
  getRemainingPrincipal,
  getScheduleRemaining,
  resolveScheduleStatus,
} from "@/lib/calculations";
import { formatCurrency, parseCurrencyInput } from "@/lib/currency";
import { formatDate, formatPeriod, todayDateInput } from "@/lib/date";

const quickPaySchema = z.object({
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  transactionDate: z.string().min(1),
  note: z.string().optional(),
  interestAmount: z.number().min(0).optional(),
  principalAmount: z.number().min(0).optional(),
});

type QuickPayValues = z.infer<typeof quickPaySchema>;
type PayMode = "INTEREST" | "PRINCIPAL" | "BOTH" | null;

export function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [payMode, setPayMode] = useState<PayMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: detail, loading, error: loadError, reload } = useAsyncData(
    async () => {
      if (!id) return null;
      return fetchLoanDetail(id);
    },
    [id],
  );

  const loan = detail?.loan;
  const borrower = detail?.borrower ?? undefined;
  const transactions = detail?.transactions ?? EMPTY_ARRAY;
  const schedules = detail?.schedules ?? EMPTY_ARRAY;

  const principalPaid = getPrincipalPaid(transactions);
  const remaining = loan
    ? getRemainingPrincipal(loan.principalAmount, transactions)
    : 0;
  const interestPaid = getInterestPaid(transactions);
  const currentSchedule = getCurrentInterestSchedule(schedules);

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [schedules],
  );
  const sortedTx = useMemo(
    () =>
      [...transactions].sort((a, b) =>
        b.transactionDate.localeCompare(a.transactionDate),
      ),
    [transactions],
  );

  const form = useForm<QuickPayValues>({
    resolver: zodResolver(quickPaySchema),
    defaultValues: {
      amount: 0,
      transactionDate: todayDateInput(),
      note: "",
      interestAmount: 0,
      principalAmount: 0,
    },
  });

  function openPay(mode: PayMode) {
    setError(null);
    setPayMode(mode);
    form.reset({
      amount:
        mode === "INTEREST"
          ? (currentSchedule ? getScheduleRemaining(currentSchedule) : 0)
          : mode === "PRINCIPAL"
            ? remaining
            : 0,
      transactionDate: todayDateInput(),
      note: "",
      interestAmount: currentSchedule
        ? getScheduleRemaining(currentSchedule)
        : 0,
      principalAmount: 0,
    });
  }

  async function onSubmit(values: QuickPayValues) {
    if (!id || !payMode) return;
    setSubmitting(true);
    setError(null);
    try {
      if (payMode === "INTEREST") {
        await recordInterestPayment({
          loanId: id,
          amount: values.amount,
          transactionDate: values.transactionDate,
          note: values.note,
        });
      } else if (payMode === "PRINCIPAL") {
        await recordPrincipalPayment({
          loanId: id,
          amount: values.amount,
          transactionDate: values.transactionDate,
          note: values.note,
        });
      } else {
        const interest = values.interestAmount ?? 0;
        const principal = values.principalAmount ?? 0;
        if (interest <= 0 && principal <= 0) {
          throw new Error("Cần nhập ít nhất gốc hoặc lời");
        }
        await recordCombinedPayment({
          loanId: id,
          interestAmount: interest,
          principalAmount: principal,
          transactionDate: values.transactionDate,
          note: values.note,
        });
      }
      setPayMode(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể ghi nhận thanh toán");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !detail) {
    return (
      <PageShell header={<AppHeader title="Khoản vay" />}>
        <EmptyState title="Đang tải..." />
      </PageShell>
    );
  }

  if (loadError || !loan) {
    return (
      <PageShell header={<AppHeader title="Khoản vay" />}>
        <EmptyState
          title="Không tìm thấy khoản vay"
          action={
            <Button asChild variant="outline">
              <Link to="/loans">Quay lại</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      header={
        <AppHeader
          title={borrower?.name ?? "Khoản vay"}
          description={`Bắt đầu ${formatDate(loan.startDate)}`}
          actions={
            <div className="flex items-center gap-2">
              <LoanStatusBadge status={loan.status} />
              <Button asChild variant="outline" size="sm">
                <Link to="/loans">
                  <ArrowLeft className="size-4" />
                  Quay lại
                </Link>
              </Button>
            </div>
          }
        />
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Gốc ban đầu"
          value={formatCurrency(loan.principalAmount)}
        />
        <StatCard title="Đã thu gốc" value={formatCurrency(principalPaid)} />
        <StatCard title="Dư nợ hiện tại" value={formatCurrency(remaining)} />
        <StatCard
          title="Lời hàng tháng"
          value={formatCurrency(loan.monthlyInterestAmount)}
        />
        <StatCard
          title="Tổng lời đã thu"
          value={formatCurrency(interestPaid)}
        />
      </div>

      {loan.status === "ACTIVE" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openPay("INTEREST")}>+ Thu lời</Button>
          <Button variant="secondary" onClick={() => openPay("PRINCIPAL")}>
            + Thu gốc
          </Button>
          <Button variant="outline" onClick={() => openPay("BOTH")}>
            Thu cả gốc + lời
          </Button>
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              void cancelLoan(loan.id).then(() => reload());
            }}
          >
            Hủy khoản vay
          </Button>
        </div>
      )}

      {loan.note && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            Ghi chú: {loan.note}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lịch thu tiền lời</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSchedules.length === 0 ? (
            <EmptyState title="Chưa có lịch thu" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kỳ</TableHead>
                    <TableHead>Ngày đến hạn</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Đã thu</TableHead>
                    <TableHead>Còn thiếu</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSchedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{formatPeriod(s.period)}</TableCell>
                      <TableCell>{formatDate(s.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(s.amount)}</TableCell>
                      <TableCell>{formatCurrency(s.paidAmount)}</TableCell>
                      <TableCell>
                        {formatCurrency(getScheduleRemaining(s))}
                      </TableCell>
                      <TableCell>
                        <ScheduleStatusBadge
                          status={resolveScheduleStatus(s)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTx.length === 0 ? (
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
                  {sortedTx.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                      <TableCell>
                        <TransactionTypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell>{tx.note || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={payMode !== null} onOpenChange={() => setPayMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {payMode === "INTEREST"
                ? "Thu tiền lời"
                : payMode === "PRINCIPAL"
                  ? "Thu tiền gốc"
                  : "Thu gốc + lời"}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {payMode === "INTEREST" && currentSchedule && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p>Kỳ hiện tại: {formatPeriod(currentSchedule.period)}</p>
                <p>Phải thu: {formatCurrency(currentSchedule.amount)}</p>
                <p>Đã thu: {formatCurrency(currentSchedule.paidAmount)}</p>
                <p>
                  Còn thiếu:{" "}
                  {formatCurrency(getScheduleRemaining(currentSchedule))}
                </p>
              </div>
            )}
            {payMode === "PRINCIPAL" && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p>Dư nợ hiện tại: {formatCurrency(remaining)}</p>
                <p>
                  Dư nợ sau khi thu:{" "}
                  {formatCurrency(
                    Math.max(remaining - (form.watch("amount") || 0), 0),
                  )}
                </p>
              </div>
            )}
            {payMode === "BOTH" ? (
              <>
                <div className="space-y-2">
                  <Label>Số tiền lời</Label>
                  <Input
                    inputMode="numeric"
                    value={
                      form.watch("interestAmount")
                        ? String(form.watch("interestAmount"))
                        : ""
                    }
                    onChange={(e) =>
                      form.setValue(
                        "interestAmount",
                        parseCurrencyInput(e.target.value),
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số tiền gốc</Label>
                  <Input
                    inputMode="numeric"
                    value={
                      form.watch("principalAmount")
                        ? String(form.watch("principalAmount"))
                        : ""
                    }
                    onChange={(e) =>
                      form.setValue(
                        "principalAmount",
                        parseCurrencyInput(e.target.value),
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Dư nợ hiện tại: {formatCurrency(remaining)}
                  </p>
                </div>
                {/* Satisfy amount validation for BOTH */}
                <input
                  type="hidden"
                  value={1}
                  onChange={() => form.setValue("amount", 1)}
                />
              </>
            ) : (
              <div className="space-y-2">
                <Label>Số tiền *</Label>
                <Input
                  inputMode="numeric"
                  value={
                    form.watch("amount") ? String(form.watch("amount")) : ""
                  }
                  onChange={(e) =>
                    form.setValue("amount", parseCurrencyInput(e.target.value), {
                      shouldValidate: true,
                    })
                  }
                />
                {form.formState.errors.amount && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.amount.message}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Ngày thu *</Label>
              <Input type="date" {...form.register("transactionDate")} />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea {...form.register("note")} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayMode(null)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                onClick={() => {
                  if (payMode === "BOTH") {
                    form.setValue("amount", 1);
                  }
                }}
              >
                Ghi nhận
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
