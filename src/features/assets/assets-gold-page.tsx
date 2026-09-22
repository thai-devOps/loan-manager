import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
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
  ResponsiveFormFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import { MoneyInput } from "@/features/finance/components/money-input";
import { GoldPurchaseFormDialog } from "@/features/assets/components/gold-purchase-form-dialog";
import {
  useAssetSummaryQuery,
  useGoldPricesLatestQuery,
  useGoldPurchasesQuery,
} from "@/api/queries";
import {
  useDeleteGoldPurchaseMutation,
  useUpdateAssetSettingsMutation,
} from "@/api/mutations";
import { formatCurrency } from "@/lib/currency";
import { formatDateOnly } from "@/lib/date";
import { currentMonthKey } from "@/features/finance/lib/calculations";
import {
  calculateAllocationPercentage,
  monthQuantityPhan,
  monthSpend,
} from "@/features/assets/lib/calculations";
import {
  buildGoldPriceMapFromMarket,
  estimatePurchaseMarketValue,
  estimatePurchasesMarketValue,
  formatBranchLabel,
  resolvePurchaseBuyPrice,
} from "@/features/assets/lib/resolve-reference-price";
import {
  formatChiDecimal,
  formatGoldQuantity,
} from "@/features/assets/lib/gold-units";
import { goldPurchaseLabel } from "@/features/assets/lib/gold-type-catalog";
import { goldPricesSchema } from "@/schemas/assets.schema";
import type { GoldPurchase } from "@/types/assets";
import { EMPTY_ARRAY } from "@/lib/empty";
import { cn } from "@/lib/utils";
import { z } from "zod";

function recentCalendarMonths(count: number): string[] {
  const months: string[] = [];
  const [y0, m0] = currentMonthKey().split("-").map(Number);
  let y = y0!;
  let m = m0!;
  for (let i = 0; i < count; i++) {
    months.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return months;
}

export function AssetsGoldPage() {
  const summaryQ = useAssetSummaryQuery();
  const purchasesQ = useGoldPurchasesQuery();
  const marketQ = useGoldPricesLatestQuery(true);
  const deleteM = useDeleteGoldPurchaseMutation();

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [editing, setEditing] = useState<GoldPurchase | null>(null);
  const [deleting, setDeleting] = useState<GoldPurchase | null>(null);
  const [pricesOpen, setPricesOpen] = useState(false);

  const purchases = purchasesQ.data ?? EMPTY_ARRAY;
  const summary = summaryQ.data;

  const valuation = useMemo(() => {
    if (!summary) {
      return {
        prices: { "9999": 0, "18k": 0, other: 0 },
        anyFromMarket: false,
        goldValue: 0,
        goldDifference: 0,
      };
    }
    const { prices, anyFromMarket } = buildGoldPriceMapFromMarket(
      summary.settings.goldReferencePricePerChi,
      marketQ.data,
    );
    const fromPurchases = estimatePurchasesMarketValue(
      purchases,
      marketQ.data,
      prices,
    );
    return {
      prices,
      anyFromMarket: anyFromMarket || Boolean(marketQ.data?.prices?.length),
      goldValue: fromPurchases.goldValue,
      goldDifference: fromPurchases.goldDifference,
    };
  }, [summary, marketQ.data, purchases]);

  const holdings = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; phan: number; cost: number; value: number }
    >();
    for (const p of purchases) {
      const key = p.sourceCode?.trim() || `legacy:${p.type}`;
      const label = goldPurchaseLabel(p);
      const price = resolvePurchaseBuyPrice({
        sourceCode: p.sourceCode,
        type: p.type,
        market: marketQ.data,
        fallbackPrices: valuation.prices,
      });
      const value = estimatePurchaseMarketValue(p.quantityInPhan, price);
      const cur = map.get(key) ?? {
        key,
        label,
        phan: 0,
        cost: 0,
        value: 0,
      };
      cur.phan += p.quantityInPhan;
      cur.cost += p.totalCost;
      cur.value += value;
      map.set(key, cur);
    }
    return [...map.values()].filter((h) => h.phan > 0);
  }, [purchases, marketQ.data, valuation.prices]);

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
    valuation.goldValue,
    summary.totalAssets - summary.goldValue + valuation.goldValue,
  );
  const recentMonths = recentCalendarMonths(6);
  const priceHint = valuation.anyFromMarket
    ? marketQ.data?.stale
      ? `PNJ · ${formatBranchLabel(marketQ.data.branch)} (snapshot cũ)`
      : marketQ.data?.branch
        ? `Theo giá mua PNJ · ${formatBranchLabel(marketQ.data.branch)}`
        : "Theo giá mua PNJ"
    : "Theo giá tham chiếu thủ công (fallback)";

  function purchaseTempProfit(p: GoldPurchase) {
    const price = resolvePurchaseBuyPrice({
      sourceCode: p.sourceCode,
      type: p.type,
      market: marketQ.data,
      fallbackPrices: valuation.prices,
    });
    const marketValue = estimatePurchaseMarketValue(p.quantityInPhan, price);
    return marketValue - p.totalCost;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Giao dịch vàng</h2>
          <p className="text-sm text-muted-foreground">
            Theo dõi lượng vàng đang sở hữu và các lần mua vàng
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/assets/gold-plan">Kế hoạch vàng</Link>
          </Button>
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
          value={formatCurrency(valuation.goldValue)}
          hint={priceHint}
        />
        <StatCard
          title="Giá vốn"
          value={formatCurrency(summary.goldCost)}
          hint="Tổng chi phí các lần mua"
        />
        <StatCard
          title="Lãi tạm tính"
          value={`${valuation.goldDifference >= 0 ? "+" : ""}${formatCurrency(valuation.goldDifference)}`}
          hint="Giá trị theo PNJ − giá vốn"
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
                <div key={h.key} className="rounded-xl border p-4">
                  <p className="font-medium">{h.label}</p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatGoldQuantity(h.phan)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Giá vốn: {formatCurrency(h.cost)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Giá trị ước tính: {formatCurrency(h.value)}
                  </p>
                  <p
                    className={cn(
                      "text-sm tabular-nums",
                      h.value - h.cost >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400",
                    )}
                  >
                    Lãi tạm: {h.value - h.cost >= 0 ? "+" : ""}
                    {formatCurrency(h.value - h.cost)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                      <TableHead className="text-right">Lãi tạm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((p) => {
                      const temp = purchaseTempProfit(p);
                      return (
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
                          <TableCell>
                            {formatDateOnly(p.purchaseDate)}
                          </TableCell>
                          <TableCell>{goldPurchaseLabel(p)}</TableCell>
                          <TableCell>
                            {formatGoldQuantity(p.quantityInPhan)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(p.purchasePricePerChi)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(p.totalCost)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right tabular-nums",
                              temp >= 0
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-700 dark:text-rose-400",
                            )}
                          >
                            {temp >= 0 ? "+" : ""}
                            {formatCurrency(temp)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {purchases.map((p) => {
                  const temp = purchaseTempProfit(p);
                  return (
                    <div key={p.id} className="rounded-xl border p-4">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {goldPurchaseLabel(p)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateOnly(p.purchaseDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(p.totalCost)}
                          </p>
                          <p
                            className={cn(
                              "text-xs tabular-nums",
                              temp >= 0
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-rose-700 dark:text-rose-400",
                            )}
                          >
                            Lãi tạm {temp >= 0 ? "+" : ""}
                            {formatCurrency(temp)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatGoldQuantity(p.quantityInPhan)} ·{" "}
                        {formatCurrency(p.purchasePricePerChi)}/chỉ
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setEditing(p);
                            setPurchaseOpen(true);
                          }}
                        >
                          <EditIcon size={14} />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-destructive"
                          onClick={() => setDeleting(p)}
                        >
                          <DeleteIcon size={14} />
                          Xóa
                        </Button>
                      </div>
                    </div>
                  );
                })}
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
              value={formatCurrency(valuation.goldValue)}
            />
            <AnalyticRow
              label="Lãi / lỗ tạm tính"
              value={`${valuation.goldDifference >= 0 ? "+" : ""}${formatCurrency(valuation.goldDifference)}`}
            />
            <AnalyticRow
              label="Tỷ trọng vàng trong tổng tài sản"
              value={`${goldShare}%`}
            />
            <AnalyticRow
              label="Nguồn giá"
              value={
                valuation.anyFromMarket
                  ? `PNJ · ${formatBranchLabel(marketQ.data?.branch ?? "")}`
                  : "Giá thủ công"
              }
            />
          </div>

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
              {deleting ? formatDateOnly(deleting.purchaseDate) : ""}. Khối
              lượng và giá vốn sẽ được cập nhật lại.
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
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title="Giá tham chiếu hiện tại"
      desktopClassName="max-w-md"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
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
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
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
        </div>
        <ResponsiveFormFooter>
          <Button type="submit" disabled={update.isPending}>
            Lưu giá tham chiếu
          </Button>
        </ResponsiveFormFooter>
      </form>
    </ResponsiveFormShell>
  );
}
