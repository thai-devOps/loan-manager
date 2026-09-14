import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { EMPTY_ARRAY } from "@/lib/empty";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db/database";
import { createBorrower } from "@/features/borrowers/borrower.service";
import { getRemainingPrincipal } from "@/lib/calculations";
import { formatCurrency } from "@/lib/currency";
import {
  borrowerSchema,
  type BorrowerFormValues,
} from "@/schemas/borrower.schema";

export function BorrowersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const borrowers = useLiveQuery(() => db.borrowers.toArray(), []) ?? EMPTY_ARRAY;
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? EMPTY_ARRAY;
  const transactions =
    useLiveQuery(() => db.transactions.toArray(), []) ?? EMPTY_ARRAY;

  const form = useForm<BorrowerFormValues>({
    resolver: zodResolver(borrowerSchema),
    defaultValues: {
      name: "",
      phone: "",
      identityNumber: "",
      address: "",
      note: "",
    },
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

  async function onSubmit(values: BorrowerFormValues) {
    setSubmitting(true);
    try {
      await createBorrower(values);
      form.reset();
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      header={
        <AppHeader
          title="Người vay"
          description="Quản lý danh sách người vay"
          actions={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Thêm người vay
            </Button>
          }
        />
      }
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

      {rows.length === 0 ? (
        <EmptyState
          title="Chưa có người vay"
          description="Thêm người vay đầu tiên để bắt đầu quản lý khoản vay."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Thêm người vay
            </Button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map(({ borrower, loanCount, remaining, status }) => (
              <Link
                key={borrower.id}
                to={`/borrowers/${borrower.id}`}
                className="block rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{borrower.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {borrower.phone || "Không có SĐT"}
                    </p>
                  </div>
                  {status !== "NONE" && (
                    <LoanStatusBadge
                      status={status === "ACTIVE" ? "ACTIVE" : "COMPLETED"}
                    />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Khoản vay</p>
                    <p className="font-medium">{loanCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dư nợ</p>
                    <p className="font-medium">{formatCurrency(remaining)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm người vay</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
