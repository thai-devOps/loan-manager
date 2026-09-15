import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Settings2 } from "lucide-react";
import { DeleteIcon, EditIcon } from "@/components/icons";
import { EmptyState, StatCard } from "@/components/common/status-badges";
import { StatCardsSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/features/finance/components/money-input";
import { GoldPurchaseFormDialog } from "@/features/assets/components/gold-purchase-form-dialog";
import {
  useAssetSummaryQuery,
  useGoldPlanQuery,
  useGoldPurchasesQuery,
} from "@/api/queries";
import {
  useDeleteGoldPurchaseMutation,
  useUpdateAssetSettingsMutation,
  useUpsertGoldPlanMutation,
} from "@/api/mutations";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { currentMonthKey } from "@/features/finance/lib/calculations";
import {
  calculateEstimatedMonthsToGoal,
  calculateGoldGoalProgress,
  calculateRemainingGoldGoal,
  listPlanMonths,
  monthSpend,
  monthlyPlanStatus,
  monthlyPlanStatusLabel,
} from "@/features/assets/lib/calculations";
import {
  formatChiDecimal,
  formatGoldQuantity,
  GOLD_TYPE_LABELS,
  phanToChi,
} from "@/features/assets/lib/gold-units";
import {
  goldPlanSchema,
  goldPricesSchema,
  type GoldPlanFormValues,
} from "@/schemas/assets.schema";
import type { GoldPurchase } from "@/types/assets";
import { EMPTY_ARRAY } from "@/lib/empty";
import { cn } from "@/lib/utils";
import { z } from "zod";

export function AssetsGoldPage() {
  const summaryQ = useAssetSummaryQuery();
  const purchasesQ = useGoldPurchasesQuery();
  const planQ = useGoldPlanQuery();
  const deleteM = useDeleteGoldPurchaseMutation();

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [editing, setEditing] = useState<GoldPurchase | null>(null);
  const [deleting, setDeleting] = useState<GoldPurchase | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);

  const purchases = purchasesQ.data ?? EMPTY_ARRAY;
  const summary = summaryQ.data;
  const plan = planQ.data ?? summary?.plan ?? null;
  const month = currentMonthKey();

  const holdings = useMemo(() => {
    if (!summary) return [];
    return (Object.keys(GOLD_TYPE_LABELS) as Array<keyof typeof GOLD_TYPE_LABELS>)
      .map((type) => {
        const phan = summary.quantityByType[type] ?? 0;
        if (phan <= 0) return null;
        const cost = purchases
          .filter((p) => p.type === type)
          .reduce((s, p) => s + p.totalCost, 0);
        const price =
          summary.settings.goldReferencePricePerChi[type] ?? 0;
        const value = Math.round(phanToChi(phan) * price);
        return { type, phan, cost, value };
      })
      .filter(Boolean) as {
      type: keyof typeof GOLD_TYPE_LABELS;
      phan: number;
      cost: number;
      value: number;
    }[];
  }, [summary, purchases]);

  if (summaryQ.isLoading || purchasesQ.isLoading) {
    return <StatCardsSkeleton />;
  }

  if (summaryQ.isError || !summary) {
    return (
      <EmptyState
        title="Không thể tải dữ liệu tài sản"
        description="Thử lại sau vài giây."
        action={
          <Button variant="outline" onClick={() => void summaryQ.refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const progress = plan
    ? calculateGoldGoalProgress(summary.goldCost, plan.targetAmount)
    : 0;
  const remaining = plan
    ? calculateRemainingGoldGoal(summary.goldCost, plan.targetAmount)
    : 0;
  const estMonths = plan
    ? calculateEstimatedMonthsToGoal(remaining, plan.monthlyBudget)
    : null;

  const planMonths = plan ? listPlanMonths(plan).slice(-6) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tích lũy vàng</h2>
          <p className="text-sm text-muted-foreground">
            Theo dõi lượng vàng đang sở hữu và kế hoạch mua vàng hàng tháng
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setPricesOpen(true)}
          >
            <Settings2 className="size-4" />
            Giá tham chiếu
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditing(null);
              setPurchaseOpen(true);
            }}
          >
            <Plus className="size-4" />
            Thêm lần mua
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng vàng"
          value={formatGoldQuantity(summary.totalGoldPhan)}
          hint={formatChiDecimal(summary.totalGoldPhan)}
        />
        <StatCard
          title="Giá trị ước tính"
          value={formatCurrency(summary.goldValue)}
          hint="Theo giá tham chiếu bạn đã nhập"
        />
        <StatCard
          title="Tổng tiền đã mua"
          value={formatCurrency(summary.goldCost)}
          hint="Tổng chi phí các lần mua"
        />
        <StatCard
          title="Chênh lệch giá trị tạm tính"
          value={`${summary.goldDifference >= 0 ? "+" : ""}${formatCurrency(summary.goldDifference)}`}
          hint="Ước tính − giá vốn (không phải lợi nhuận chắc chắn)"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vàng đang sở hữu</CardTitle>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <EmptyState
              title="Chưa có giao dịch vàng"
              description="Bắt đầu ghi nhận lần mua đầu tiên."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setPurchaseOpen(true);
                  }}
                >
                  Thêm lần mua
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {holdings.map((h) => (
                <div key={h.type} className="rounded-xl border p-4">
                  <p className="font-medium">{GOLD_TYPE_LABELS[h.type]}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatGoldQuantity(h.phan)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Giá vốn: {formatCurrency(h.cost)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Giá trị ước tính: {formatCurrency(h.value)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Kế hoạch tích lũy vàng</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPlanOpen(true)}
          >
            {plan ? "Sửa kế hoạch" : "Tạo kế hoạch"}
          </Button>
        </CardHeader>
        <CardContent>
          {!plan ? (
            <EmptyState
              title="Bạn chưa có kế hoạch tích lũy vàng"
              description="Đặt mục tiêu tổng và ngân sách hàng tháng để theo dõi tiến độ."
              action={
                <Button size="sm" onClick={() => setPlanOpen(true)}>
                  Tạo kế hoạch
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Snapshot label="Mục tiêu" value={formatCurrency(plan.targetAmount)} />
                <Snapshot
                  label="Đã tích lũy"
                  value={formatCurrency(summary.goldCost)}
                />
                <Snapshot label="Tiến độ" value={`${progress}%`} />
                <Snapshot
                  label="Kế hoạch hàng tháng"
                  value={`${formatCurrency(plan.monthlyBudget)} / tháng`}
                />
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-600"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Ngày dự kiến mua: ngày {plan.plannedPurchaseDay} hàng tháng
                {estMonths != null &&
                  ` · Ước tính theo kế hoạch hiện tại: còn khoảng ${estMonths} tháng`}
              </p>

              <div className="space-y-2">
                <p className="text-sm font-medium">Các tháng gần đây</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {planMonths.map((m) => {
                    const spent = monthSpend(purchases, m);
                    const status = monthlyPlanStatus({
                      month: m,
                      budget: plan.monthlyBudget,
                      spent,
                      currentMonth: month,
                    });
                    return (
                      <div
                        key={m}
                        className="rounded-lg border px-3 py-2.5 text-sm"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">Tháng {m}</span>
                          <span
                            className={cn(
                              "text-xs",
                              status === "completed" && "text-emerald-700",
                              status === "deferred" && "text-amber-700",
                              status === "in_progress" && "text-sky-700",
                            )}
                          >
                            {monthlyPlanStatusLabel(status)}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          Ngân sách: {formatCurrency(plan.monthlyBudget)}
                        </p>
                        <p className="text-muted-foreground">
                          Đã mua: {formatCurrency(spent)}
                        </p>
                        <p className="text-muted-foreground">
                          Còn lại:{" "}
                          {formatCurrency(
                            Math.max(plan.monthlyBudget - spent, 0),
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lịch sử mua vàng</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có lần mua nào được ghi nhận.
            </p>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Thao tác</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Khối lượng</TableHead>
                      <TableHead className="text-right">Giá mua</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditing(p);
                                setPurchaseOpen(true);
                              }}
                            >
                              <EditIcon />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleting(p)}
                            >
                              <DeleteIcon />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(p.createdAt)}
                        </TableCell>
                        <TableCell>{GOLD_TYPE_LABELS[p.type]}</TableCell>
                        <TableCell>
                          {formatGoldQuantity(p.quantityInPhan)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(p.purchasePricePerChi)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(p.totalCost)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {purchases.map((p) => (
                  <div key={p.id} className="rounded-xl border p-4">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {GOLD_TYPE_LABELS[p.type]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {formatCurrency(p.totalCost)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatGoldQuantity(p.quantityInPhan)} ·{" "}
                      {formatCurrency(p.purchasePricePerChi)}/chỉ
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(p);
                          setPurchaseOpen(true);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleting(p)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <GoldPurchaseFormDialog
        open={purchaseOpen}
        onOpenChange={(open) => {
          setPurchaseOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
      />

      <GoldPlanDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        existing={plan}
      />

      <GoldPricesDialog
        open={pricesOpen}
        onOpenChange={setPricesOpen}
        prices={summary.settings.goldReferencePricePerChi}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa lần mua?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa giao dịch mua vàng ngày{" "}
              {deleting
                ? formatDate(deleting.createdAt)
                : ""}
              . Khối lượng và giá vốn sẽ được cập nhật lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                void deleteM
                  .mutateAsync(deleting.id)
                  .then(() => setDeleting(null));
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

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

function GoldPlanDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: import("@/types/assets").GoldPlan | null;
}) {
  const upsert = useUpsertGoldPlanMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<GoldPlanFormValues>({
    resolver: zodResolver(goldPlanSchema),
    values: existing
      ? {
          targetAmount: existing.targetAmount,
          monthlyBudget: existing.monthlyBudget,
          plannedPurchaseDay: existing.plannedPurchaseDay,
          startMonth: existing.startMonth,
          endMonth: existing.endMonth,
          status: existing.status,
        }
      : {
          targetAmount: 50_000_000,
          monthlyBudget: 2_000_000,
          plannedPurchaseDay: 25,
          startMonth: currentMonthKey(),
          endMonth: `${new Date().getFullYear() + 1}-12`,
          status: "active",
        },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Sửa kế hoạch" : "Tạo kế hoạch tích lũy vàng"}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              await upsert.mutateAsync({
                targetAmount: values.targetAmount,
                monthlyBudget: values.monthlyBudget,
                plannedPurchaseDay: values.plannedPurchaseDay,
                startMonth: values.startMonth,
                endMonth: values.endMonth,
                status: values.status ?? "active",
              });
              onOpenChange(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Không thể lưu");
            }
          })}
        >
          <div className="space-y-2">
            <Label>Mục tiêu tổng</Label>
            <MoneyInput
              value={form.watch("targetAmount")}
              onChange={(v) => form.setValue("targetAmount", v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ngân sách mua vàng / tháng</Label>
            <MoneyInput
              value={form.watch("monthlyBudget")}
              onChange={(v) => form.setValue("monthlyBudget", v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-day">Ngày dự kiến mua (1–28)</Label>
            <Input
              id="plan-day"
              type="number"
              min={1}
              max={28}
              {...form.register("plannedPurchaseDay", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Chỉ là ngày nhắc kế hoạch, không phải khuyến nghị thời điểm mua.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="plan-start">Bắt đầu</Label>
              <Input id="plan-start" type="month" {...form.register("startMonth")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-end">Kết thúc</Label>
              <Input id="plan-end" type="month" {...form.register("endMonth")} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? "Đang lưu..." : "Lưu kế hoạch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoldPricesDialog({
  open,
  onOpenChange,
  prices,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prices: { "9999": number; "18k": number; other: number };
}) {
  const update = useUpdateAssetSettingsMutation();
  const [error, setError] = useState<string | null>(null);
  type PricesForm = z.infer<typeof goldPricesSchema>;
  const form = useForm<PricesForm>({
    resolver: zodResolver(goldPricesSchema),
    values: prices,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Giá tham chiếu hiện tại</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              await update.mutateAsync({
                goldReferencePricePerChi: values,
              });
              onOpenChange(false);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Không thể lưu");
            }
          })}
        >
          <p className="text-sm text-muted-foreground">
            Dùng để ước tính giá trị vàng. Không phải giá bán đảm bảo.
          </p>
          {(
            [
              ["9999", "Vàng 9999 (₫/chỉ)"],
              ["18k", "Vàng 18K (₫/chỉ)"],
              ["other", "Khác (₫/chỉ)"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <MoneyInput
                value={form.watch(key)}
                onChange={(v) => form.setValue(key, v)}
              />
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={update.isPending}>
              Lưu giá tham chiếu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
