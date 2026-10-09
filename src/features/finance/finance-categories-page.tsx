import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_COLORS } from "@shared/finance/category-catalog";
import {
  useFinanceCategoriesQuery,
  useFinanceTransactionsQuery,
} from "@/api/queries";
import {
  useCreateFinanceCategoryMutation,
  useDeleteFinanceCategoryMutation,
  useUpdateFinanceCategoryMutation,
} from "@/api/mutations";
import { EmptyState } from "@/components/common/status-badges";
import { TablePageSkeleton } from "@/components/common/loading-skeletons";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Can } from "@/features/auth/can";
import { PERMISSIONS } from "@/config/permissions";
import {
  CATEGORY_ICON_OPTIONS,
  categoryIcon,
} from "@/features/finance/lib/category-icons";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { FinanceCategoryRecord, FinanceTransactionType } from "@/types/finance";

const PAGE_SIZE = 10;

type StatusFilter = "all" | "active" | "paused";
type SortKey = "default" | "name" | "count" | "amount";

type Draft = {
  name: string;
  description: string;
  type: FinanceTransactionType;
  icon: string;
  color: string;
  isActive: boolean;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  type: "expense",
  icon: "Utensils",
  color: CATEGORY_COLORS[0],
  isActive: true,
};

export function FinanceCategoriesPage() {
  const categoriesQuery = useFinanceCategoriesQuery();
  const transactionsQuery = useFinanceTransactionsQuery();
  const [type, setType] = useState<FinanceTransactionType>("expense");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<FinanceCategoryRecord | null>(null);
  const [iconQuery, setIconQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<FinanceCategoryRecord | null>(null);

  const usage = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const tx of transactionsQuery.data ?? []) {
      const bucket = map.get(tx.category) ?? { count: 0, amount: 0 };
      bucket.count += 1;
      bucket.amount += tx.amount;
      map.set(tx.category, bucket);
    }
    return map;
  }, [transactionsQuery.data]);

  const ofType = useMemo(
    () => (categoriesQuery.data ?? []).filter((row) => row.type === type),
    [categoriesQuery.data, type],
  );

  const stats = useMemo(() => {
    const sum = (rows: FinanceCategoryRecord[]) =>
      rows.reduce((total, row) => total + (usage.get(row.key)?.count ?? 0), 0);
    const active = ofType.filter((row) => row.isActive);
    const paused = ofType.filter((row) => !row.isActive);
    return {
      total: ofType.length,
      totalTx: sum(ofType),
      active: active.length,
      activeTx: sum(active),
      paused: paused.length,
      pausedTx: sum(paused),
    };
  }, [ofType, usage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("vi");
    const rows = ofType.filter((row) => {
      if (status === "active" && !row.isActive) return false;
      if (status === "paused" && row.isActive) return false;
      if (!q) return true;
      return row.name.toLocaleLowerCase("vi").includes(q);
    });
    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "vi");
      if (sort === "count") {
        return (usage.get(b.key)?.count ?? 0) - (usage.get(a.key)?.count ?? 0);
      }
      if (sort === "amount") {
        return (usage.get(b.key)?.amount ?? 0) - (usage.get(a.key)?.amount ?? 0);
      }
      return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi");
    });
    return rows;
  }, [ofType, search, status, sort, usage]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function openCreate() {
    setEditing(null);
    setIconQuery("");
    setDraft({ ...EMPTY_DRAFT, type });
  }

  function openEdit(row: FinanceCategoryRecord) {
    setEditing(row);
    setIconQuery("");
    setDraft({
      name: row.name,
      description: row.description ?? "",
      type: row.type,
      icon: row.icon,
      color: row.color,
      isActive: row.isActive,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quản lý danh mục</h1>
          <p className="text-sm text-muted-foreground">
            Tên, màu và biểu tượng dùng cho giao dịch thu chi.
          </p>
        </div>
        <Can permission={PERMISSIONS.FINANCE_TRANSACTION_UPDATE}>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Thêm danh mục
          </Button>
        </Can>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border bg-muted/40 p-1">
          {(
            [
              ["expense", "Chi tiêu"],
              ["income", "Thu nhập"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={cn(
                "rounded-full px-4 py-1.5 text-sm",
                type === value && "bg-background shadow-sm",
              )}
              onClick={() => {
                setType(value);
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Tổng danh mục" value={stats.total} hint={`${stats.totalTx} giao dịch`} />
        <StatCard label="Đang hoạt động" value={stats.active} hint={`${stats.activeTx} giao dịch`} />
        <StatCard label="Tạm dừng" value={stats.paused} hint={`${stats.pausedTx} giao dịch`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tên"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="paused">Tạm dừng</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Mặc định</SelectItem>
            <SelectItem value="name">Tên</SelectItem>
            <SelectItem value="count">Số giao dịch</SelectItem>
            <SelectItem value="amount">Tổng tiền</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {categoriesQuery.isLoading ? (
        <TablePageSkeleton />
      ) : categoriesQuery.isError ? (
        <EmptyState
          title="Không tải được danh mục"
          description={
            categoriesQuery.error instanceof Error
              ? categoriesQuery.error.message
              : "Lỗi API"
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Chưa có danh mục"
          description="Thêm danh mục hoặc chạy script seed nếu đây là lần đầu."
        />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Danh mục</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead className="text-right">Giao dịch</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const Icon = categoryIcon(row.icon);
                const stat = usage.get(row.key) ?? { count: 0, amount: 0 };
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex size-9 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: row.color }}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span>
                          <span className="block font-medium">{row.name}</span>
                          {row.description ? (
                            <span className="block text-xs text-muted-foreground">
                              {row.description}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{row.type === "income" ? "Thu nhập" : "Chi tiêu"}</TableCell>
                    <TableCell className="text-right">{stat.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(stat.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "secondary"}>
                        {row.isActive ? "Đang hoạt động" : "Tạm dừng"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Can permission={PERMISSIONS.FINANCE_TRANSACTION_UPDATE}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Thao tác">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(row)}>Sửa</DropdownMenuItem>
                            {row.isActive ? (
                              <DropdownMenuItem onClick={() => setPendingDelete(row)}>
                                Ngừng hoạt động
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => setPendingDelete(row)}>
                                Xóa
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </Can>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              {filtered.length} danh mục
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
              >
                Trước
              </Button>
              <span>
                {safePage + 1}/{pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage + 1 >= pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </div>
      )}

      <CategoryDrawer
        open={draft !== null}
        draft={draft}
        editing={editing}
        iconQuery={iconQuery}
        onIconQuery={setIconQuery}
        onChange={setDraft}
        onClose={() => setDraft(null)}
      />

      <DeleteCategoryDialog
        row={pendingDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function CategoryDrawer({
  open,
  draft,
  editing,
  iconQuery,
  onIconQuery,
  onChange,
  onClose,
}: {
  open: boolean;
  draft: Draft | null;
  editing: FinanceCategoryRecord | null;
  iconQuery: string;
  onIconQuery: (value: string) => void;
  onChange: (draft: Draft | null) => void;
  onClose: () => void;
}) {
  const createMutation = useCreateFinanceCategoryMutation();
  const updateMutation = useUpdateFinanceCategoryMutation();
  const pending = createMutation.isPending || updateMutation.isPending;
  const icons = CATEGORY_ICON_OPTIONS.filter((item) =>
    item.name.toLowerCase().includes(iconQuery.trim().toLowerCase()),
  );

  async function save() {
    if (!draft) return;
    const body = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      type: draft.type,
      icon: draft.icon,
      color: draft.color,
      isActive: draft.isActive,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body });
        toast.success("Đã cập nhật danh mục");
      } else {
        await createMutation.mutateAsync(body);
        toast.success("Đã thêm danh mục");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được danh mục");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Sửa danh mục" : "Thêm danh mục"}</SheetTitle>
          <SheetDescription>Tên hiển thị trên giao dịch và báo cáo.</SheetDescription>
        </SheetHeader>
        {draft ? (
          <div className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Tên</Label>
              <Input
                id="category-name"
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Loại</Label>
              <div className="inline-flex rounded-full border p-1">
                {(
                  [
                    ["income", "Thu nhập"],
                    ["expense", "Chi tiêu"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded-full px-3 py-1 text-sm",
                      draft.type === value && "bg-foreground text-background",
                    )}
                    onClick={() => onChange({ ...draft, type: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Biểu tượng</Label>
              <Input
                placeholder="Tìm biểu tượng"
                value={iconQuery}
                onChange={(e) => onIconQuery(e.target.value)}
              />
              <div className="grid grid-cols-6 gap-2">
                {icons.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      aria-label={item.name}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md border",
                        draft.icon === item.name && "border-foreground",
                      )}
                      onClick={() => onChange({ ...draft, icon: item.name })}
                    >
                      <Icon className="size-4" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Màu</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    className={cn(
                      "size-7 rounded-full border-2",
                      draft.color === color ? "border-foreground" : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => onChange({ ...draft, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Đang hoạt động</Label>
              <Button
                type="button"
                variant={draft.isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onChange({ ...draft, isActive: !draft.isActive })}
              >
                {draft.isActive ? "Bật" : "Tắt"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-desc">Mô tả</Label>
              <Textarea
                id="category-desc"
                maxLength={200}
                value={draft.description}
                onChange={(e) => onChange({ ...draft, description: e.target.value })}
              />
              <p className="text-right text-xs text-muted-foreground">
                {draft.description.length}/200
              </p>
            </div>
          </div>
        ) : null}
        <SheetFooter className="px-4 pb-4">
          <Button type="button" onClick={save} disabled={pending || !draft?.name.trim()}>
            Lưu danh mục
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DeleteCategoryDialog({
  row,
  onClose,
}: {
  row: FinanceCategoryRecord | null;
  onClose: () => void;
}) {
  const deleteMutation = useDeleteFinanceCategoryMutation();
  const updateMutation = useUpdateFinanceCategoryMutation();

  async function confirm() {
    if (!row) return;
    try {
      if (row.isActive) {
        await updateMutation.mutateAsync({ id: row.id, body: { isActive: false } });
        toast.success("Đã tạm dừng danh mục");
      } else {
        const result = await deleteMutation.mutateAsync(row.id);
        toast.success(
          result.deactivated
            ? "Danh mục đã có giao dịch nên chỉ được tạm dừng"
            : "Đã xóa danh mục",
        );
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thực hiện được");
    }
  }

  return (
    <AlertDialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {row?.isActive ? "Ngừng hoạt động danh mục?" : "Xóa danh mục?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {row?.isActive
              ? `${row.name} sẽ không hiện trong form giao dịch mới. Giao dịch cũ vẫn giữ tên này.`
              : "Nếu danh mục đã gắn giao dịch, hệ thống chỉ tạm dừng thay vì xóa hẳn."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Xác nhận</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
