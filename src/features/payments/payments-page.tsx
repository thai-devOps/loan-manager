import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EMPTY_ARRAY } from "@/lib/empty";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppHeader } from "@/components/layout/app-header";
import { LoansModuleChrome } from "@/features/loans/loans-layout";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import { EmptyState, PageShell } from "@/components/common/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecordPaymentMutation } from "@/api/mutations";
import {
  useBorrowersQuery,
  useLoansQuery,
  useSchedulesQuery,
  useTransactionsQuery,
} from "@/api/queries";
import {
  getCurrentInterestSchedule,
  getRemainingPrincipal,
  getScheduleRemaining,
} from "@/lib/calculations";
import { formatCurrency, parseCurrencyInput } from "@/lib/currency";
import { formatPeriod, todayDateInput } from "@/lib/date";
import {
  paymentSchema,
  type PaymentFormValues,
} from "@/schemas/payment.schema";

export function PaymentsPage() {
  const [searchParams] = useSearchParams();
  const presetLoanId = searchParams.get("loanId") ?? "";
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recordPaymentMutation = useRecordPaymentMutation();

  const borrowersQ = useBorrowersQuery();
  const loansQ = useLoansQuery("ACTIVE");
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

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      loanId: presetLoanId,
      paymentType: "INTEREST_PAYMENT",
      amount: 0,
      interestAmount: 0,
      principalAmount: 0,
      transactionDate: todayDateInput(),
      note: "",
    },
  });

  useEffect(() => {
    if (presetLoanId) {
      form.setValue("loanId", presetLoanId);
    }
  }, [presetLoanId, form]);

  const loanId = form.watch("loanId");
  const paymentType = form.watch("paymentType");
  const selectedLoan = loans.find((l) => l.id === loanId);
  const loanTxs = transactions.filter((t) => t.loanId === loanId);
  const loanSchedules = schedules.filter((s) => s.loanId === loanId);
  const remaining = selectedLoan
    ? getRemainingPrincipal(selectedLoan.principalAmount, loanTxs)
    : 0;
  const currentSchedule = getCurrentInterestSchedule(loanSchedules);

  async function onSubmit(values: PaymentFormValues) {
    setError(null);
    setSuccess(null);
    try {
      if (values.paymentType === "INTEREST_PAYMENT") {
        await recordPaymentMutation.mutateAsync({
          loanId: values.loanId,
          paymentType: "INTEREST_PAYMENT",
          amount: values.amount ?? values.interestAmount ?? 0,
          transactionDate: values.transactionDate,
          note: values.note,
        });
      } else if (values.paymentType === "PRINCIPAL_PAYMENT") {
        await recordPaymentMutation.mutateAsync({
          loanId: values.loanId,
          paymentType: "PRINCIPAL_PAYMENT",
          amount: values.amount ?? values.principalAmount ?? 0,
          transactionDate: values.transactionDate,
          note: values.note,
        });
      } else {
        await recordPaymentMutation.mutateAsync({
          loanId: values.loanId,
          paymentType: "BOTH",
          interestAmount: values.interestAmount ?? 0,
          principalAmount: values.principalAmount ?? 0,
          transactionDate: values.transactionDate,
          note: values.note,
        });
      }
      setSuccess("Đã ghi nhận thanh toán thành công");
      form.setValue("amount", 0);
      form.setValue("interestAmount", 0);
      form.setValue("principalAmount", 0);
      form.setValue("note", "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể ghi nhận");
    }
  }

  return (
    <PageShell
      header={
        <AppHeader
          title="Thu tiền"
          description="Ghi nhận thu lời hoặc thu gốc"
        />
      }
      subNav={<LoansModuleChrome />}
    >
      {isLoading ? (
        <TablePageSkeleton showSearch={false} rows={4} />
      ) : loans.length === 0 ? (
        <EmptyState title="Không có khoản vay đang hoạt động để thu tiền" />
      ) : (
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Ghi nhận thanh toán</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <div className="space-y-2">
                <Label>Khoản vay *</Label>
                <Controller
                  control={form.control}
                  name="loanId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn khoản vay" />
                      </SelectTrigger>
                      <SelectContent>
                        {loans.map((loan) => (
                          <SelectItem key={loan.id} value={loan.id}>
                            {borrowerMap.get(loan.borrowerId)?.name ?? "—"} ·{" "}
                            {formatCurrency(loan.principalAmount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.loanId && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.loanId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Loại thanh toán *</Label>
                <Controller
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTEREST_PAYMENT">
                          Thu lời
                        </SelectItem>
                        <SelectItem value="PRINCIPAL_PAYMENT">
                          Thu gốc
                        </SelectItem>
                        <SelectItem value="BOTH">Thu gốc + lời</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {selectedLoan && paymentType === "PRINCIPAL_PAYMENT" && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                  <p>Dư nợ hiện tại: {formatCurrency(remaining)}</p>
                  <p>
                    Số tiền muốn thu:{" "}
                    {formatCurrency(form.watch("amount") || 0)}
                  </p>
                  <p>
                    Dư nợ sau khi thu:{" "}
                    {formatCurrency(
                      Math.max(remaining - (form.watch("amount") || 0), 0),
                    )}
                  </p>
                </div>
              )}

              {selectedLoan && paymentType === "INTEREST_PAYMENT" && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                  {currentSchedule ? (
                    <>
                      <p>
                        Kỳ lời hiện tại:{" "}
                        {formatPeriod(currentSchedule.period)}
                      </p>
                      <p>
                        Số tiền phải thu:{" "}
                        {formatCurrency(currentSchedule.amount)}
                      </p>
                      <p>
                        Đã thu: {formatCurrency(currentSchedule.paidAmount)}
                      </p>
                      <p>
                        Còn thiếu:{" "}
                        {formatCurrency(getScheduleRemaining(currentSchedule))}
                      </p>
                    </>
                  ) : (
                    <p>Không còn kỳ lời chưa thu</p>
                  )}
                </div>
              )}

              {paymentType === "BOTH" ? (
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
                          { shouldValidate: true },
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
                          { shouldValidate: true },
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Dư nợ hiện tại: {formatCurrency(remaining)}
                    </p>
                  </div>
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
                      form.setValue(
                        "amount",
                        parseCurrencyInput(e.target.value),
                        { shouldValidate: true },
                      )
                    }
                  />
                  {(form.watch("amount") ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(form.watch("amount") ?? 0)}
                    </p>
                  )}
                  {form.formState.errors.amount && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.amount.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Ngày thu *</Label>
                <DatePicker
                  value={form.watch("transactionDate")}
                  onChange={(v) =>
                    form.setValue("transactionDate", v, {
                      shouldValidate: true,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Textarea {...form.register("note")} />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-success">{success}</p>}

              <Button
                type="submit"
                disabled={recordPaymentMutation.isPending}
                className="w-full"
              >
                Ghi nhận thanh toán
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
