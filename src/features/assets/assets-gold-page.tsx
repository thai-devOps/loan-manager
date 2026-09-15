import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Settings2 } from "lucide-react";
import { DeleteIcon, EditIcon } from "@/components/icons";
import { EmptyState, StatCard } from "@/components/common/status-badges";
import { StatCardsSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { GoldPlanFormDialog } from "@/features/assets/components/gold-plan-form-dialog";
import { GoldPlanCard } from "@/features/assets/components/gold-plan-card";
import {
  useAssetSummaryQuery,
  useGoldPlanQuery,
  useGoldPurchasesQuery,
} from "@/api/queries";
import {
  useDeleteGoldPurchaseMutation,
  useUpdateAssetSettingsMutation,
} from "@/api/mutations";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { currentMonthKey } from "@/features/finance/lib/calculations";
import {
  calculateAllocationPercentage,
  calculateGoldGoalProgress,
  monthQuantityPhan,
  monthSpend,
  normalizeGoldPlan,
  planAccumulatedPhan,
  planHasQuantityTarget,
  listPlanMonths,
} from "@/features/assets/lib/calculations";
import { createGoldPriceService } from "@/features/assets/lib/gold-price-service";
import {
  formatChiDecimal,
  formatGoldQuantity,
  GOLD_TYPE_LABELS,
  phanToChi,
} from "@/features/assets/lib/gold-units";
import { goldPricesSchema } from "@/schemas/assets.schema";
import type { GoldPurchase } from "@/types/assets";
import { EMPTY_ARRAY } from "@/lib/empty";
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
  const planRaw = planQ.data ?? summary?.plan ?? null;
  const plan = planRaw ? normalizeGoldPlan(planRaw) : null;
  const month = currentMonthKey();

  const holdings = useMemo(() => {
    if (!summary) return [];
    const priceService = createGoldPriceService(
      summary.settings.goldReferencePricePerChi,
    );
    return (
      Object.keys(GOLD_TYPE_LABELS) as Array<keyof typeof GOLD_TYPE_LABELS>
    )
      .map((type) => {
        const phan = summary.quantityByType[type] ?? 0;
        if (phan <= 0) return null;
        const cost = purchases
          .filter((p) => p.type === type)
          .reduce((s, p) => s + p.totalCost, 0);
        const price = priceService.getCurrentGoldPrice(type);
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

  const goldShare = calculateAllocationPercentage(
    summary.goldValue,
    summary.totalAssets,
  );
  const planProgress =
    plan && planHasQuantityTarget(plan)
      ? calculateGoldGoalProgress(
          planAccumulatedPhan(plan, purchases),
          plan.targetQuantityInPhan!,
        )
      : plan
        ? calculateGoldGoalProgress(summary.goldCost, plan.targetAmount)
        : null;

  const recentMonths = plan ? listPlanMonths(plan).slice(-6) : [];

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
            Thêm giao dịch mua vàng
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
          title="Giá vốn"
          value={formatCurrency(summary.goldCost)}
          hint="Tổng chi phí các lần mua"
        />
        <StatCard
          title="Lãi tạm tính"
          value={`${summary.goldDifference >= 0 ? "+" : ""}${formatCurrency(summary.goldDifference)}`}
          hint="Giá trị hiện tại − giá vốn"
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
                  Thêm giao dịch mua vàng
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

      <GoldPlanCard
        plan={plan}
        purchases={purchases}
        summary={summary}
        currentMonth={month}
        onEdit={() => setPlanOpen(true)}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Giao dịch vàng</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <EmptyState
              title="Chưa có giao dịch mua vàng"
              description="Ghi nhận lần mua để cập nhật tài sản và tiến độ kế hoạch."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setPurchaseOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Thêm giao dịch mua vàng
                </Button>
              }
            />
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setEditing(null);
                    setPurchaseOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Thêm giao dịch mua vàng
                </Button>
              </div>
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
                              aria-label="Sửa"
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
                              aria-label="Xóa"
                              onClick={() => setDeleting(p)}
                            >
                              <DeleteIcon />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(p.purchaseDate)}</TableCell>
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
                          {formatDate(p.purchaseDate)}
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Phân tích tích lũy vàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <AnalyticRow
              label="Tổng số vàng đã tích lũy"
              value={formatGoldQuantity(summary.totalGoldPhan)}
            />
            <AnalyticRow
              label="Giá vốn"
              value={formatCurrency(summary.goldCost)}
            />
            <AnalyticRow
              label="Giá trị hiện tại"
              value={formatCurrency(summary.goldValue)}
            />
            <AnalyticRow
              label="Lãi / lỗ tạm tính"
              value={`${summary.goldDifference >= 0 ? "+" : ""}${formatCurrency(summary.goldDifference)}`}
            />
            <AnalyticRow
              label="Tỷ trọng vàng trong tổng tài sản"
              value={`${goldShare}%`}
            />
            <AnalyticRow
              label="Tiến độ kế hoạch"
              value={
                planProgress != null
                  ? `${planProgress}%`
                  : "Chưa có kế hoạch"
              }
            />
          </div>

          {recentMonths.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Theo tháng gần đây</p>
              <div className="space-y-2">
                {recentMonths.map((m) => {
                  const [y, mo] = m.split("-");
                  return (
                    <div
                      key={m}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">
                        {mo}/{y}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(monthSpend(purchases, m))} ·{" "}
                        {formatGoldQuantity(monthQuantityPhan(purchases, m))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
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

      <GoldPlanFormDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        existing={plan}
        purchases={purchases}
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
            <AlertDialogTitle>Xóa giao dịch mua?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa giao dịch mua vàng ngày{" "}
              {deleting ? formatDate(deleting.purchaseDate) : ""}. Khối lượng
              và giá vốn sẽ được cập nhật lại.
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

function AnalyticRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
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
