import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { DeleteIcon, EditIcon } from "@/components/icons";
import { EMPTY_ARRAY } from "@/lib/empty";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
import {
  MobileList,
  MobileListCard,
} from "@/components/common/mobile-list-card";
import { EmptyState } from "@/components/common/status-badges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useDeleteFinanceTransactionMutation } from "@/api/mutations";
import { useFinanceTransactionsQuery } from "@/api/queries";
import { useFinanceMonth } from "@/features/finance/finance-context";
import { useFinanceOutlet } from "@/features/finance/use-finance-outlet";
import { Can } from "@/features/auth/can";
import { PERMISSIONS } from "@/config/permissions";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryLabel,
} from "@/features/finance/lib/categories";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { FinanceTransaction } from "@/types/finance";

export function FinanceTransactionsPage() {
  const { from, to } = useFinanceMonth();
  const { openEdit } = useFinanceOutlet();
  const q = useFinanceTransactionsQuery({ from, to });
  const deleteMutation = useDeleteFinanceTransactionMutation();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "income" | "expense">(
    "ALL",
  );
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [deleting, setDeleting] = useState<FinanceTransaction | null>(null);

  const items = q.data ?? EMPTY_ARRAY;
  const categories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  const rows = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    return [...items]
      .filter((t) => (typeFilter === "ALL" ? true : t.type === typeFilter))
      .filter((t) =>
        categoryFilter === "ALL" ? true : t.category === categoryFilter,
      )
      .filter((t) => {
        if (!qLower) return true;
        return (
          t.description.toLowerCase().includes(qLower) ||
          (t.note ?? "").toLowerCase().includes(qLower) ||
          categoryLabel(t.category).toLowerCase().includes(qLower)
        );
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.createdAt.localeCompare(a.createdAt),
      );
  }, [items, search, typeFilter, categoryFilter]);

  if (q.isError) {
    return (
      <EmptyState
        title="Không tải được giao dịch"
        action={
          <Button variant="outline" onClick={() => void q.refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <Input
          placeholder="Tìm nội dung, ghi chú..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="lg:max-w-xs"
        />
        <Select
          value={typeFilter}
          onValueChange={(v) =>
            setTypeFilter(v as "ALL" | "income" | "expense")
          }
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả loại</SelectItem>
            <SelectItem value="income">Thu nhập</SelectItem>
            <SelectItem value="expense">Chi tiêu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tất cả danh mục</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {q.isLoading ? (
        <TablePageSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title="Không có giao dịch phù hợp" />
      ) : (
        <>
          <MobileList>
            {rows.map((tx) => (
              <MobileListCard
                key={tx.id}
                tone={tx.type === "income" ? "success" : "danger"}
                icon={
                  tx.type === "income" ? (
                    <ArrowUpRight />
                  ) : (
                    <ArrowDownRight />
                  )
                }
                title={tx.description}
                subtitle={`${formatDate(tx.createdAt)} · ${categoryLabel(tx.category)}`}
                primaryValue={
                  <span
                    className={
                      tx.type === "income" ? "text-success" : "text-destructive"
                    }
                  >
                    {tx.type === "income" ? "+" : "−"}
                    {formatCurrency(tx.amount)}
                  </span>
                }
                badge={
                  <Badge variant="secondary">
                    {tx.type === "income" ? "Thu" : "Chi"}
                  </Badge>
                }
                footer={
                  <div className="flex gap-2">
                    <Can permission={PERMISSIONS.FINANCE_TRANSACTION_UPDATE}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEdit(tx)}
                      >
                        <EditIcon size={14} />
                        Sửa
                      </Button>
                    </Can>
                    <Can permission={PERMISSIONS.FINANCE_TRANSACTION_DELETE}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive"
                        onClick={() => setDeleting(tx)}
                      >
                        <DeleteIcon size={14} />
                        Xóa
                      </Button>
                    </Can>
                  </div>
                }
              />
            ))}
          </MobileList>

          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Thao tác</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="inline-flex gap-1">
                        <Can permission={PERMISSIONS.FINANCE_TRANSACTION_UPDATE}>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(tx)}
                            aria-label="Sửa"
                          >
                            <EditIcon />
                          </Button>
                        </Can>
                        <Can permission={PERMISSIONS.FINANCE_TRANSACTION_DELETE}>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleting(tx)}
                            aria-label="Xóa"
                          >
                            <DeleteIcon />
                          </Button>
                        </Can>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(tx.createdAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.type === "income" ? "success" : "destructive"
                        }
                      >
                        {tx.type === "income" ? "Thu" : "Chi"}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoryLabel(tx.category)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{tx.description}</p>
                        {tx.note && (
                          <p className="text-xs text-muted-foreground">
                            {tx.note}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        tx.type === "income"
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {tx.type === "income" ? "+" : "−"}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa giao dịch?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `Xóa “${deleting.description}” (${formatCurrency(deleting.amount)}). Thao tác không hoàn tác.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleting) return;
                void deleteMutation.mutateAsync(deleting.id).then(() => {
                  setDeleting(null);
                });
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
