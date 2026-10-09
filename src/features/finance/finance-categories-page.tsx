import { useMemo, useState } from "react";
import { Filter, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<StatusFilter>("all");
  const [draftSort, setDraftSort] = useState<SortKey>("default");

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

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <StatCard label="Tổng danh mục" value={stats.total} hint={`${stats.totalTx} giao dịch`} />
        <StatCard
          label="Đang hoạt động"
          value={stats.active}
          hint={txShare(stats.activeTx, stats.totalTx)}
        />
        <StatCard
          label="Tạm dừng"
          value={stats.paused}
          hint={txShare(stats.pausedTx, stats.totalTx)}
        />
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
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
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label="Bộ lọc"
          onClick={() => {
            setDraftStatus(status);
            setDraftSort(sort);
            setFilterOpen(true);
          }}
        >
          <Filter className="size-4" />
        </Button>
        <div className="hidden gap-2 md:flex">
          <StatusSortSelects
            status={status}
            sort={sort}
            onStatus={(value) => {
              setStatus(value);
              setPage(0);
            }}
            onSort={setSort}
          />
        </div>
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
        <>
          <div className="space-y-2 md:hidden">
            {pageRows.map((row) => (
              <CategoryCard
                key={row.id}
                row={row}
                stat={usage.get(row.key) ?? { count: 0, amount: 0 }}
                onEdit={() => openEdit(row)}
                onRemove={() => setPendingDelete(row)}
              />
            ))}
          </div>
          <div className="hidden rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Giao dịch</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-24 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => {
                  const Icon = categoryIcon(row.icon);
                  const stat = usage.get(row.key) ?? { count: 0, amount: 0 };
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <CategoryIdentity row={row} icon={Icon} />
                      </TableCell>
                      <TableCell>
                        <TypePill type={row.type} />
                      </TableCell>
                      <TableCell className="text-right">{stat.count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stat.amount)}</TableCell>
                      <TableCell>
                        <StatusPill active={row.isActive} />
                      </TableCell>
                      <TableCell>
                        <RowActions
                          active={row.isActive}
                          onEdit={() => openEdit(row)}
                          onRemove={() => setPendingDelete(row)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            from={filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}
            to={Math.min(filtered.length, safePage * PAGE_SIZE + pageRows.length)}
            total={filtered.length}
            page={safePage}
            pageCount={pageCount}
            onPage={setPage}
          />
        </>
      )}

      <FilterSheet
        open={filterOpen}
        status={draftStatus}
        sort={draftSort}
        onStatus={setDraftStatus}
        onSort={setDraftSort}
        onClose={() => setFilterOpen(false)}
        onApply={() => {
          setStatus(draftStatus);
          setSort(draftSort);
          setPage(0);
          setFilterOpen(false);
        }}
      />

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

function txShare(part: number, total: number): string {
  if (total <= 0) return "0% giao dịch";
  const pct = (part / total) * 100;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
  return `${text}% giao dịch`;
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
    <div className="rounded-xl border p-3 md:p-4">
      <p className="truncate text-xs text-muted-foreground md:text-sm">{label}</p>
      <p className="text-xl font-semibold md:text-2xl">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function StatusSortSelects({
  status,
  sort,
  onStatus,
  onSort,
}: {
  status: StatusFilter;
  sort: SortKey;
  onStatus: (value: StatusFilter) => void;
  onSort: (value: SortKey) => void;
}) {
  return (
    <>
      <Select value={status} onValueChange={(value) => onStatus(value as StatusFilter)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="active">Đang hoạt động</SelectItem>
          <SelectItem value="paused">Tạm dừng</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(value) => onSort(value as SortKey)}>
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
    </>
  );
}

function CategoryIdentity({
  row,
  icon: Icon,
}: {
  row: FinanceCategoryRecord;
  icon: ReturnType<typeof categoryIcon>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: row.color }}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{row.name}</span>
        {row.description ? (
          <span className="block truncate text-xs text-muted-foreground">{row.description}</span>
        ) : null}
      </span>
    </div>
  );
}

function TypePill({ type }: { type: FinanceTransactionType }) {
  const income = type === "income";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs",
        income ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
      )}
    >
      {income ? "Thu nhập" : "Chi tiêu"}
    </span>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs",
        active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
      )}
    >
      {active ? "Đang hoạt động" : "Tạm dừng"}
    </span>
  );
}

function RowActions({
  active,
  onEdit,
  onRemove,
}: {
  active: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <Can permission={PERMISSIONS.FINANCE_TRANSACTION_UPDATE}>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label="Sửa" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={active ? "Ngừng hoạt động" : "Xóa"}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </Can>
  );
}

function CategoryCard({
  row,
  stat,
  onEdit,
  onRemove,
}: {
  row: FinanceCategoryRecord;
  stat: { count: number; amount: number };
  onEdit: () => void;
  onRemove: () => void;
}) {
  const Icon = categoryIcon(row.icon);
  return (
    <article className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-2">
        <CategoryIdentity row={row} icon={Icon} />
        <RowActions active={row.isActive} onEdit={onEdit} onRemove={onRemove} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <TypePill type={row.type} />
        <span className="text-muted-foreground">{stat.count} giao dịch</span>
        <span className="ml-auto font-medium">{formatCurrency(stat.amount)}</span>
      </div>
      <div className="mt-2">
        <StatusPill active={row.isActive} />
      </div>
    </article>
  );
}

function PaginationBar({
  from,
  to,
  total,
  page,
  pageCount,
  onPage,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        Hiển thị {from}–{to} trong {total} danh mục
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
          Trước
        </Button>
        <span>
          {page + 1}/{pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}

function FilterSheet({
  open,
  status,
  sort,
  onStatus,
  onSort,
  onClose,
  onApply,
}: {
  open: boolean;
  status: StatusFilter;
  sort: SortKey;
  onStatus: (value: StatusFilter) => void;
  onSort: (value: SortKey) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" className="md:hidden">
        <SheetHeader>
          <SheetTitle>Bộ lọc</SheetTitle>
          <SheetDescription>Trạng thái và cách sắp xếp danh mục.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <div className="grid gap-2">
              {(
                [
                  ["all", "Tất cả trạng thái"],
                  ["active", "Đang hoạt động"],
                  ["paused", "Tạm dừng"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    status === value && "border-foreground",
                  )}
                  onClick={() => onStatus(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sắp xếp</Label>
            <div className="grid gap-2">
              {(
                [
                  ["default", "Mặc định"],
                  ["name", "Tên"],
                  ["count", "Số giao dịch"],
                  ["amount", "Tổng tiền"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm",
                    sort === value && "border-foreground",
                  )}
                  onClick={() => onSort(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button type="button" className="w-full" onClick={onApply}>
            Áp dụng
          </Button>
        </div>
      </SheetContent>
    </Sheet>
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const pending = createMutation.isPending || updateMutation.isPending;

  function close() {
    setPickerOpen(false);
    onClose();
  }

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
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không lưu được danh mục");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && close()}>
      <SheetContent className="flex h-full w-full max-w-none flex-col gap-0 p-0 sm:max-w-none md:max-w-md">
        {pickerOpen && draft ? (
          <>
            <SheetHeader className="p-4">
              <SheetTitle>Chọn biểu tượng và màu sắc</SheetTitle>
              <SheetDescription>Chọn icon và màu cho danh mục.</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <IconColorFields
                draft={draft}
                iconQuery={iconQuery}
                onIconQuery={onIconQuery}
                onChange={onChange}
              />
            </div>
            <SheetFooter className="p-4">
              <Button type="button" className="w-full" onClick={() => setPickerOpen(false)}>
                Áp dụng
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader className="p-4">
              <SheetTitle>{editing ? "Sửa danh mục" : "Thêm danh mục"}</SheetTitle>
              <SheetDescription>Tên hiển thị trên giao dịch và báo cáo.</SheetDescription>
            </SheetHeader>
            {draft ? (
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
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
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border p-3 text-left md:hidden"
                  onClick={() => setPickerOpen(true)}
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: draft.color }}
                  >
                    {(() => {
                      const Icon = categoryIcon(draft.icon);
                      return <Icon className="size-4" />;
                    })()}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">Biểu tượng và màu</span>
                    <span className="block text-xs text-muted-foreground">{draft.icon}</span>
                  </span>
                </button>
                <div className="hidden md:block">
                  <IconColorFields
                    draft={draft}
                    iconQuery={iconQuery}
                    onIconQuery={onIconQuery}
                    onChange={onChange}
                  />
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
            <SheetFooter className="p-4">
              <Button type="button" onClick={save} disabled={pending || !draft?.name.trim()}>
                Lưu danh mục
              </Button>
              <Button type="button" variant="outline" onClick={close}>
                Hủy
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function IconColorFields({
  draft,
  iconQuery,
  onIconQuery,
  onChange,
}: {
  draft: Draft;
  iconQuery: string;
  onIconQuery: (value: string) => void;
  onChange: (draft: Draft) => void;
}) {
  const icons = CATEGORY_ICON_OPTIONS.filter((item) =>
    item.name.toLowerCase().includes(iconQuery.trim().toLowerCase()),
  );
  return (
    <div className="space-y-4">
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
    </div>
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
            {row?.isActive ? "Xác nhận ngừng hoạt động" : "Xác nhận xóa danh mục"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {row?.isActive
              ? `Danh mục "${row.name}" sẽ không hiện khi thêm giao dịch mới. Giao dịch cũ vẫn giữ tên này.`
              : `Bạn có chắc muốn xóa danh mục "${row?.name ?? ""}"? Nếu đã có giao dịch, hệ thống chỉ tạm dừng.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={confirm}
          >
            {row?.isActive ? "Ngừng hoạt động" : "Xóa danh mục"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
