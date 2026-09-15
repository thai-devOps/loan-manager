import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { EMPTY_ARRAY } from "@/lib/empty";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HandCoins, Plus } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { LoansModuleChrome } from "@/features/loans/loans-layout";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import {
  MobileList,
  MobileListCard,
  toneFromLoanStatus,
} from "@/components/common/mobile-list-card";
import {
  EmptyState,
  LoanStatusBadge,
  PageShell,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateLoanMutation } from "@/api/mutations";
import {
  useBorrowersQuery,
  useLoansQuery,
  useTransactionsQuery,
} from "@/api/queries";
import {
  getPrincipalPaid,
  getRemainingPrincipal,
} from "@/lib/calculations";
import { formatCurrency, parseCurrencyInput } from "@/lib/currency";
import { formatDate, todayDateInput } from "@/lib/date";
import { loanSchema, type LoanFormValues } from "@/schemas/loan.schema";
import type { LoanStatus } from "@/types/loan";

type Filter = "ALL" | LoanStatus;

export function LoansPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetBorrowerId = searchParams.get("borrowerId") ?? "";
  const [filter, setFilter] = useState<Filter>("ALL");
  const [open, setOpen] = useState(Boolean(presetBorrowerId));
  const [error, setError] = useState<string | null>(null);
  const createLoanMutation = useCreateLoanMutation();

  const borrowersQ = useBorrowersQuery();
  const loansQ = useLoansQuery();
  const transactionsQ = useTransactionsQuery();
  const isLoading =
    borrowersQ.isLoading || loansQ.isLoading || transactionsQ.isLoading;

  const borrowers = useMemo(
    () =>
      [...(borrowersQ.data ?? EMPTY_ARRAY)].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [borrowersQ.data],
  );
  const loans = loansQ.data ?? EMPTY_ARRAY;
  const transactions = transactionsQ.data ?? EMPTY_ARRAY;

  const borrowerMap = useMemo(
    () => new Map(borrowers.map((b) => [b.id, b])),
    [borrowers],
  );

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      borrowerId: presetBorrowerId,
      principalAmount: 0,
      monthlyInterestAmount: 0,
      startDate: todayDateInput(),
      note: "",
    },
  });

  const filtered = loans.filter((l) =>
    filter === "ALL" ? true : l.status === filter,
  );

  async function onSubmit(values: LoanFormValues) {
    setError(null);
    try {
      const loan = await createLoanMutation.mutateAsync(values);
      form.reset({
        borrowerId: "",
        principalAmount: 0,
        monthlyInterestAmount: 0,
        startDate: todayDateInput(),
        note: "",
      });
      setOpen(false);
      navigate(`/loans/${loan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tạo khoản vay");
    }
  }

  return (
    <PageShell
      header={
        <AppHeader
          title="Khoản vay"
          description="Quản lý các khoản cho vay cá nhân"
          actions={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Tạo khoản vay
            </Button>
          }
        />
      }
      subNav={<LoansModuleChrome />}
    >
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as Filter)}
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
          <TabsTrigger value="ALL">Tất cả</TabsTrigger>
          <TabsTrigger value="ACTIVE">Đang hoạt động</TabsTrigger>
          <TabsTrigger value="COMPLETED">Đã hoàn tất</TabsTrigger>
          <TabsTrigger value="CANCELLED">Đã hủy</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <TablePageSkeleton showSearch={false} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Chưa có khoản vay"
          description="Tạo khoản vay mới để bắt đầu theo dõi gốc và lời."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Tạo khoản vay
            </Button>
          }
        />
      ) : (
        <>
          <MobileList>
            {filtered.map((loan) => {
              const txs = transactions.filter((t) => t.loanId === loan.id);
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
                  title={borrowerMap.get(loan.borrowerId)?.name ?? "—"}
                  badge={<LoanStatusBadge status={loan.status} />}
                  primaryValue={formatCurrency(remaining)}
                  meta={`Gốc ${formatCurrency(loan.principalAmount)} · Lời ${formatCurrency(loan.monthlyInterestAmount)}/th`}
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
                  <TableHead>Gốc ban đầu</TableHead>
                  <TableHead>Đã thu gốc</TableHead>
                  <TableHead>Dư nợ</TableHead>
                  <TableHead>Lời/tháng</TableHead>
                  <TableHead>Ngày bắt đầu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((loan) => {
                  const txs = transactions.filter((t) => t.loanId === loan.id);
                  return (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/loans/${loan.id}`}>Chi tiết</Link>
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {borrowerMap.get(loan.borrowerId)?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(loan.principalAmount)}
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
                      <TableCell>{formatDate(loan.createdAt)}</TableCell>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo khoản vay</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label>Người vay *</Label>
              <Controller
                control={form.control}
                name="borrowerId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn người vay" />
                    </SelectTrigger>
                    <SelectContent>
                      {borrowers.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.borrowerId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.borrowerId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="principalAmount">Số tiền gốc *</Label>
              <Input
                id="principalAmount"
                inputMode="numeric"
                placeholder="100000000"
                onChange={(e) =>
                  form.setValue(
                    "principalAmount",
                    parseCurrencyInput(e.target.value),
                    { shouldValidate: true },
                  )
                }
                value={
                  form.watch("principalAmount")
                    ? String(form.watch("principalAmount"))
                    : ""
                }
              />
              {form.watch("principalAmount") > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(form.watch("principalAmount"))}
                </p>
              )}
              {form.formState.errors.principalAmount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.principalAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyInterestAmount">
                Tiền lời hàng tháng *
              </Label>
              <Input
                id="monthlyInterestAmount"
                inputMode="numeric"
                placeholder="3000000"
                onChange={(e) =>
                  form.setValue(
                    "monthlyInterestAmount",
                    parseCurrencyInput(e.target.value),
                    { shouldValidate: true },
                  )
                }
                value={
                  form.watch("monthlyInterestAmount")
                    ? String(form.watch("monthlyInterestAmount"))
                    : ""
                }
              />
              {form.watch("monthlyInterestAmount") > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(form.watch("monthlyInterestAmount"))}
                </p>
              )}
              {form.formState.errors.monthlyInterestAmount && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.monthlyInterestAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Ngày bắt đầu *</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register("startDate")}
              />
              {form.formState.errors.startDate && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.startDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="loan-note">Ghi chú</Label>
              <Textarea id="loan-note" {...form.register("note")} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={createLoanMutation.isPending}>
                Tạo khoản vay
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
