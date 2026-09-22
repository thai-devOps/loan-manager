import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/status-badges";
import { formatCurrency } from "@/lib/currency";
import {
  formatChiDecimal,
  formatGoldQuantity,
  GOLD_TYPE_LABELS,
} from "@/features/assets/lib/gold-units";
import {
  monthlyPlanStatusLabel,
  normalizeGoldPlan,
  type MonthlyPlanStatus,
} from "@/features/assets/lib/calculations";
import {
  buildGoldPlanMonthRows,
  computeGoldPlanMetrics,
} from "@/features/assets/lib/gold-plan-metrics";
import { useGoldPricesLatestQuery } from "@/api/queries";
import {
  formatBranchLabel,
  resolveReferenceBuyPrice,
} from "@/features/assets/lib/resolve-reference-price";
import { createGoldPriceService } from "@/features/assets/lib/gold-price-service";
import type { AssetSummary, GoldPlan, GoldPurchase } from "@/types/assets";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${m}/${y}`;
}

function formatSourceUpdatedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusTone(status: MonthlyPlanStatus): string {
  switch (status) {
    case "completed":
      return "text-emerald-700 dark:text-emerald-400";
    case "exceeded":
      return "text-sky-700 dark:text-sky-400";
    case "deferred":
      return "text-amber-700 dark:text-amber-400";
    case "in_progress":
      return "text-sky-700 dark:text-sky-400";
    default:
      return "text-muted-foreground";
  }
}

export function GoldPlanCard({
  plan,
  purchases,
  summary,
  currentMonth,
  onEdit,
}: {
  plan: GoldPlan | null;
  purchases: GoldPurchase[];
  summary: AssetSummary;
  currentMonth: string;
  onEdit: () => void;
}) {
  const pricesQ = useGoldPricesLatestQuery(Boolean(plan));

  if (!plan) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState
            title="Chưa có kế hoạch tích lũy vàng"
            description="Thiết lập mục tiêu vàng và ngân sách hàng tháng để Monely theo dõi tiến độ cho bạn."
            action={
              <Button size="sm" onClick={onEdit}>
                + Tạo kế hoạch
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const normalized = normalizeGoldPlan(plan);
  const goldType = normalized.goldType;
  const priceService = createGoldPriceService(
    summary.settings.goldReferencePricePerChi,
  );
  const fallback = goldType ? priceService.getCurrentGoldPrice(goldType) : 0;
  const resolved = resolveReferenceBuyPrice({
    goldType,
    referenceSourceCode: normalized.referenceSourceCode,
    market: pricesQ.data,
    fallbackPricePerChi: fallback,
  });
  const pricePerChi = resolved.pricePerChi;
  const metrics = computeGoldPlanMetrics(
    normalized,
    purchases,
    pricePerChi,
    currentMonth,
  );
  const monthRows = buildGoldPlanMonthRows(
    normalized,
    purchases,
    currentMonth,
  );
  const typeLabel = goldType ? GOLD_TYPE_LABELS[goldType] : null;
  const marketMeta = pricesQ.data;

  return (
    <div className="space-y-4">
      {!metrics.hasQuantityTarget ? (
        <Card>
          <CardContent className="space-y-3 py-5">
            <p className="text-sm font-medium">
              Cần cập nhật mục tiêu số lượng vàng
            </p>
            <p className="text-xs text-muted-foreground">
              Kế hoạch cũ đang dùng mục tiêu tiền (
              {formatCurrency(normalized.targetAmount)}). Tiến độ phải dựa trên
              số lượng vàng — hãy sửa kế hoạch để đặt mục tiêu theo cây/chỉ/phân.
            </p>
            <Button size="sm" onClick={onEdit}>
              Cập nhật mục tiêu số lượng
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kế hoạch tích lũy vàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
                <div className="space-y-4">
                  <div>
                    <p className="text-xl font-semibold tracking-tight sm:text-2xl">
                      {formatGoldQuantity(metrics.targetPhan)}
                      {typeLabel ? ` ${typeLabel}` : " vàng"}
                    </p>
                    {typeLabel && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Mục tiêu theo số lượng — không theo giá vàng
                      </p>
                    )}
                  </div>

                  <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-xl bg-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Đã có</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatGoldQuantity(metrics.existingPhan)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">
                        Đã mua trong kế hoạch
                      </dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatGoldQuantity(metrics.purchasedPhan)}
                      </dd>
                    </div>
                    <div className="rounded-xl bg-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Còn cần</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums">
                        {formatGoldQuantity(metrics.remainingPhan)}
                      </dd>
                    </div>
                  </dl>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-lg font-semibold tabular-nums tracking-tight sm:text-xl">
                        {formatChiDecimal(metrics.accumulatedPhan)} /{" "}
                        {formatChiDecimal(metrics.targetPhan)}
                      </p>
                      <span className="text-sm font-medium tabular-nums text-muted-foreground">
                        {metrics.progressPercent}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width]",
                          metrics.goalMet
                            ? "bg-emerald-600"
                            : "bg-amber-600/90",
                        )}
                        style={{ width: `${metrics.progressPercent}%` }}
                      />
                    </div>
                    {metrics.goalMet ? (
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Đã đạt mục tiêu
                        {metrics.overrunPhan > 0
                          ? ` · Vượt mục tiêu: ${formatGoldQuantity(metrics.overrunPhan)}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 text-sm">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Dự kiến
                  </p>
                  {metrics.goalMet ? (
                    <p className="mt-2 text-base font-semibold">Hoàn thành</p>
                  ) : metrics.estimatedMonths != null ? (
                    <>
                      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                        ~
                        {metrics.estimatedMonths.toLocaleString("vi-VN", {
                          maximumFractionDigits: 1,
                        })}{" "}
                        tháng
                      </p>
                      {metrics.estimatedEndMonth && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Dự kiến hoàn thành: ~
                          {formatMonthLabel(metrics.estimatedEndMonth)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Chưa đủ dữ liệu để ước tính (cần ngân sách và giá tham
                      chiếu).
                    </p>
                  )}
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Ước tính dựa trên ngân sách{" "}
                    {formatCurrency(metrics.monthlyBudget)}/tháng và giá tham
                    chiếu hiện tại — không phải cam kết chắc chắn.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ngân sách & ước tính</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Metric
                  label="Ngân sách"
                  value={`${formatCurrency(metrics.monthlyBudget)} / tháng`}
                />
                <Metric
                  label="Giá tham chiếu (mua vào)"
                  value={
                    pricePerChi > 0
                      ? `${formatCurrency(pricePerChi)} / chỉ`
                      : "—"
                  }
                />
                <Metric
                  label="Ước tính mua"
                  value={
                    metrics.estimatedMonthlyPhan != null &&
                    metrics.estimatedMonthlyPhan > 0
                      ? `~${metrics.estimatedMonthlyPhan.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} phân / tháng`
                      : "—"
                  }
                />
                <Metric
                  label="Ước tính thời gian"
                  value={
                    metrics.estimatedMonths != null
                      ? `~${metrics.estimatedMonths.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tháng`
                      : "—"
                  }
                />
              </div>

              {marketMeta && (
                <p className="text-xs text-muted-foreground">
                  Nguồn: {marketMeta.source} ·{" "}
                  {formatBranchLabel(marketMeta.branch)}
                  {resolved.marketPrice
                    ? ` · ${resolved.marketPrice.sourceName}`
                    : ""}
                  {" · "}
                  Cập nhật:{" "}
                  {formatSourceUpdatedAt(
                    marketMeta.sourceUpdatedAt ?? marketMeta.capturedAt,
                  )}
                  {resolved.fromMarket
                    ? ""
                    : " · đang dùng giá thủ công (fallback)"}
                </p>
              )}

              {marketMeta?.stale && (
                <div className="flex gap-2 rounded-xl border border-amber-300/70 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Giá tham chiếu chưa được cập nhật từ PNJ. Đang dùng snapshot
                    gần nhất.
                  </span>
                </div>
              )}

              {!metrics.paceOk && metrics.requiredBudgetPerMonth != null && (
                <div className="flex gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50/70 px-3 py-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      Ngân sách hiện tại có thể chưa đủ để đạt mục tiêu đúng hạn.
                    </p>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                      Ngân sách hiện tại:{" "}
                      {formatCurrency(metrics.monthlyBudget)}/tháng. Ngân sách
                      ước tính để đạt mục tiêu đúng hạn: ~
                      {formatCurrency(metrics.requiredBudgetPerMonth)}/tháng.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <CardTitle className="text-base">Tiến độ theo tháng</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Trạng thái suy ra từ giao dịch vàng thực tế
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[min(22rem,50vh)] space-y-2 overflow-y-auto pr-1">
                {monthRows.map((row) => {
                  const isCurrent = row.month === currentMonth;
                  return (
                    <div
                      key={row.month}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm",
                        isCurrent &&
                          "border-amber-500/45 bg-amber-50/40 dark:bg-amber-950/20",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {formatMonthLabel(row.month)}
                          {isCurrent ? (
                            <span className="ml-1.5 text-xs font-normal text-amber-700 dark:text-amber-400">
                              hiện tại
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            statusTone(row.status),
                          )}
                        >
                          {monthlyPlanStatusLabel(row.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                        Mục tiêu: {formatCurrency(row.budget)} · Đã mua:{" "}
                        {formatCurrency(row.spent)} · Số vàng:{" "}
                        <span className="font-medium text-foreground">
                          {formatGoldQuantity(row.quantityPhan)}
                        </span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/35 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}
