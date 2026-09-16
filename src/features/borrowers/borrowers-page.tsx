import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EMPTY_ARRAY } from "@/lib/empty";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, UserRound } from "lucide-react";
import { EditIcon } from "@/components/icons";
import { AppHeader } from "@/components/layout/app-header";
import { LoansModuleChrome } from "@/features/loans/loans-layout";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import {
  MobileList,
  MobileListCard,
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
  ResponsiveFormFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateBorrowerMutation,
  useUpdateBorrowerMutation,
} from "@/api/mutations";
import {
  useBorrowersQuery,
  useLoansQuery,
  useTransactionsQuery,
} from "@/api/queries";
import { getRemainingPrincipal } from "@/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import {
  borrowerSchema,
  type BorrowerFormValues,
} from "@/schemas/borrower.schema";
import type { Borrower } from "@/types/borrower";

const emptyForm: BorrowerFormValues = {
  name: "",
  phone: "",
  identityNumber: "",
  address: "",
  note: "",
};

export function BorrowersPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Borrower | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const createBorrowerMutation = useCreateBorrowerMutation();
  const updateBorrowerMutation = useUpdateBorrowerMutation();

  const borrowersQ = useBorrowersQuery();
  const loansQ = useLoansQuery();
  const transactionsQ = useTransactionsQuery();
  const isLoading =
    borrowersQ.isLoading || loansQ.isLoading || transactionsQ.isLoading;

  const borrowers = borrowersQ.data ?? EMPTY_ARRAY;
  const loans = loansQ.data ?? EMPTY_ARRAY;
  const transactions = transactionsQ.data ?? EMPTY_ARRAY;

  const form = useForm<BorrowerFormValues>({
    resolver: zodResolver(borrowerSchema),
    defaultValues: emptyForm,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return borrowers
      .filter((b) => {
        if (!q) return true;
        return (
          b.name.toLowerCase().includes(q) ||
          (b.phone?.toLowerCase().includes(q) ?? false)
        );
      })
      .map((b) => {
        const borrowerLoans = loans.filter((l) => l.borrowerId === b.id);
        const remaining = borrowerLoans.reduce((sum, loan) => {
          const txs = transactions.filter((t) => t.loanId === loan.id);
          return sum + getRemainingPrincipal(loan.principalAmount, txs);
        }, 0);
        const hasActive = borrowerLoans.some((l) => l.status === "ACTIVE");
        return {
          borrower: b,
          loanCount: borrowerLoans.length,
          remaining,
          status: hasActive
            ? ("ACTIVE" as const)
            : borrowerLoans.length > 0
              ? ("COMPLETED" as const)
              : ("NONE" as const),
        };
      });
  }, [borrowers, loans, transactions, search]);

  const saving =
    createBorrowerMutation.isPending || updateBorrowerMutation.isPending;

  function openCreate() {
    setEditing(null);
    setSaveError(null);
    form.reset(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(borrower: Borrower) {
    setEditing(borrower);
    setSaveError(null);
    form.reset({
      name: borrower.name,
      phone: borrower.phone ?? "",
      identityNumber: borrower.identityNumber ?? "",
      address: borrower.address ?? "",
      note: borrower.note ?? "",
    });
    setDialogOpen(true);
  }

  function closeDialog(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      setSaveError(null);
    }
  }

  async function onSubmit(values: BorrowerFormValues) {
    setSaveError(null);
    try {
      if (editing) {
        await updateBorrowerMutation.mutateAsync({
          id: editing.id,
          values,
        });
      } else {
        await createBorrowerMutation.mutateAsync(values);
      }
      form.reset(emptyForm);
      setEditing(null);
      setDialogOpen(false);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Không thể lưu người vay",
      );
    }
  }

  return (
    <PageShell
      header={
        <AppHeader
          title="Người vay"
          description="Quản lý danh sách người vay"
          actions={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Thêm người vay
            </Button>
          }
        />
      }
      subNav={<LoansModuleChrome />}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tên hoặc số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <TablePageSkeleton showSearch={false} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Chưa có người vay"
          description="Thêm người vay đầu tiên để bắt đầu quản lý khoản vay."
          action={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Thêm người vay
            </Button>
          }
        />
      ) : (
        <>
          <MobileList>
            {rows.map(({ borrower, loanCount, remaining, status }) => (
              <MobileListCard
                key={borrower.id}
                tone={
                  status === "ACTIVE"
                    ? "success"
                    : status === "COMPLETED"
                      ? "info"
                      : "accent"
                }
                icon={<UserRound />}
                title={borrower.name}
                subtitle={borrower.phone || "Không có SĐT"}
                badge={
                  status !== "NONE" ? (
                    <LoanStatusBadge
                      status={status === "ACTIVE" ? "ACTIVE" : "COMPLETED"}
                    />
                  ) : undefined
                }
                primaryValue={formatCurrency(remaining)}
                meta={`${loanCount} khoản vay`}
                footer={
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link to={`/borrowers/${borrower.id}`}>Chi tiết</Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => openEdit(borrower)}
                    >
                      <EditIcon size={14} />
                      Cập nhật
                    </Button>
                  </div>
                }
              />
            ))}
          </MobileList>

          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Thao tác</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Tổng khoản vay</TableHead>
                  <TableHead>Dư nợ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ borrower, loanCount, remaining, status }) => (
                  <TableRow key={borrower.id}>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(borrower)}
                      >
                        <EditIcon size={14} />
                        Cập nhật
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/borrowers/${borrower.id}`}
                        className="font-medium hover:underline"
                      >
                        {borrower.name}
                      </Link>
                    </TableCell>
                    <TableCell>{borrower.phone || "—"}</TableCell>
                    <TableCell>{loanCount}</TableCell>
                    <TableCell>{formatCurrency(remaining)}</TableCell>
                    <TableCell>
                      {status === "NONE" ? (
                        <span className="text-muted-foreground">Chưa vay</span>
                      ) : (
                        <LoanStatusBadge
                          status={
                            status === "ACTIVE" ? "ACTIVE" : "COMPLETED"
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ResponsiveFormShell
        open={dialogOpen}
        onOpenChange={closeDialog}
        title={editing ? "Cập nhật người vay" : "Thêm người vay"}
        desktopClassName="max-w-lg"
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="space-y-2">
              <Label htmlFor="name">Tên *</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identityNumber">CCCD/CMND</Label>
              <Input
                id="identityNumber"
                {...form.register("identityNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input id="address" {...form.register("address")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea id="note" {...form.register("note")} />
            </div>
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
          </div>
          <ResponsiveFormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeDialog(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Đang lưu..."
                : editing
                  ? "Lưu thay đổi"
                  : "Lưu"}
            </Button>
          </ResponsiveFormFooter>
        </form>
      </ResponsiveFormShell>
    </PageShell>
  );
}
