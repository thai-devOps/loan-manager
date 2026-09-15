import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/status-badges";
import { formatCurrency } from "@/lib/currency";
import {
  formatGoldQuantity,
  GOLD_TYPE_LABELS,
} from "@/features/assets/lib/gold-units";
import {
  budgetForMonth,
  calculateGoldGoalProgress,
  estimatePhanFromBudget,
  listPlanMonths,
  monthSpend,
  monthlyPlanStatus,
  monthlyPlanStatusLabel,
  normalizeGoldPlan,
  planAccumulatedPhan,
  planHasQuantityTarget,
  planRemainingPhan,
} from "@/features/assets/lib/calculations";
import { createGoldPriceService } from "@/features/assets/lib/gold-price-service";
import type { AssetSummary, GoldPlan, GoldPurchase } from "@/types/assets";
import { cn } from "@/lib/utils";

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${m}/${y}`;
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
  if (!plan) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Kế hoạch tích lũy vàng</CardTitle>
          <Button size="sm" variant="outline" onClick={onEdit}>
            Tạo kế hoạch
          </Button>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Bạn chưa có kế hoạch tích lũy vàng"
            description="Đặt mục tiêu số lượng vàng và ngân sách hàng tháng để theo dõi tiến độ."
            action={
              <Button size="sm" onClick={onEdit}>
                Tạo kế hoạch
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const normalized = normalizeGoldPlan(plan);
  const hasQty = planHasQuantityTarget(normalized);
  const accumulated = planAccumulatedPhan(normalized, purchases);
  const targetQty = normalized.targetQuantityInPhan ?? 0;
  const remaining = planRemainingPhan(normalized, purchases);
  const progress = hasQty
    ? calculateGoldGoalProgress(accumulated, targetQty)
    : calculateGoldGoalProgress(summary.goldCost, normalized.targetAmount);
  const planMonths = listPlanMonths(normalized).slice(-6);
  const goldType = normalized.goldType;
  const priceService = createGoldPriceService(
    summary.settings.goldReferencePricePerChi,
  );
  const pricePerChi = goldType
    ? priceService.getCurrentGoldPrice(goldType)
    : 0;
  const estimatedMonthlyPhan = estimatePhanFromBudget(
    normalized.monthlyBudget,
    pricePerChi,
  );
  const typeLabel = goldType ? GOLD_TYPE_LABELS[goldType] : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Kế hoạch tích lũy vàng</CardTitle>
        <Button size="sm" variant="outline" onClick={onEdit}>
          Sửa kế hoạch
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {!hasQty ? (
          <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-sm font-medium">
              Cần cập nhật mục tiêu số lượng vàng
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Kế hoạch cũ đang dùng mục tiêu tiền (
              {formatCurrency(normalized.targetAmount)}). Tiến độ số lượng chưa
              thể tính — hãy sửa kế hoạch để đặt mục tiêu theo chỉ/phân.
            </p>
            <Button size="sm" className="mt-3" onClick={onEdit}>
              Cập nhật mục tiêu số lượng
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xl font-semibold tracking-tight">
                {formatGoldQuantity(targetQty)}
                {typeLabel ? ` ${typeLabel}` : " vàng"}
              </p>
              {typeLabel && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Loại kế hoạch: {typeLabel}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatGoldQuantity(accumulated)} /{" "}
              {formatGoldQuantity(targetQty)}
            </p>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-600/90 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium tabular-nums">{progress}%</span>
              {remaining != null && (
                <span className="text-muted-foreground">
                  Còn thiếu {formatGoldQuantity(remaining)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1.5 border-t pt-4 text-sm">
          <Row
            label="Ngân sách"
            value={`${formatCurrency(normalized.monthlyBudget)} / tháng`}
          />
          {estimatedMonthlyPhan != null && estimatedMonthlyPhan > 0 && (
            <Row
              label="Ước tính mua"
              value={`~${formatGoldQuantity(estimatedMonthlyPhan)}/tháng`}
            />
          )}
          {pricePerChi > 0 && (
            <Row
              label="Giá tham chiếu"
              value={`${formatCurrency(pricePerChi)}/chỉ`}
            />
          )}
          <Row
            label="Ngày nhắc"
            value={`${normalized.plannedPurchaseDay} hàng tháng`}
          />
          <Row label="Dự kiến" value={formatMonthLabel(normalized.endMonth)} />
          {hasQty && remaining != null && remaining > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">
              Thời gian hoàn thành phụ thuộc vào giá vàng và số lượng mua thực
              tế.
            </p>
          )}
        </div>

        <div className="space-y-1.5 border-t pt-4 text-sm">
          <Row label="Giá vốn" value={formatCurrency(summary.goldCost)} />
          <Row
            label="Giá trị hiện tại"
            value={formatCurrency(summary.goldValue)}
          />
          <Row
            label="Lãi tạm tính"
            value={`${summary.goldDifference >= 0 ? "+" : ""}${formatCurrency(summary.goldDifference)}`}
            valueClassName={
              summary.goldDifference >= 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400"
            }
          />
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Các tháng gần đây</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {planMonths.map((m) => {
              const budget = budgetForMonth(normalized, m);
              const spent = monthSpend(
                goldType
                  ? purchases.filter((p) => p.type === goldType)
                  : purchases,
                m,
              );
              const status = monthlyPlanStatus({
                month: m,
                budget,
                spent,
                currentMonth,
                planStatus: normalized.status,
              });
              const over = spent > budget ? spent - budget : 0;
              const remain = Math.max(budget - spent, 0);
              return (
                <div
                  key={m}
                  className="rounded-lg border px-3 py-2.5 text-sm"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      Tháng {formatMonthLabel(m)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        status === "completed" &&
                          "text-emerald-700 dark:text-emerald-400",
                        status === "exceeded" &&
                          "text-sky-700 dark:text-sky-400",
                        status === "deferred" &&
                          "text-amber-700 dark:text-amber-400",
                        status === "in_progress" &&
                          "text-sky-700 dark:text-sky-400",
                        status === "paused" && "text-muted-foreground",
                      )}
                    >
                      {status === "completed" || status === "exceeded"
                        ? `✓ ${monthlyPlanStatusLabel(status)}`
                        : monthlyPlanStatusLabel(status)}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Mục tiêu: {formatCurrency(budget)}
                  </p>
                  <p className="text-muted-foreground">
                    Đã mua: {formatCurrency(spent)}
                  </p>
                  {over > 0 ? (
                    <p className="text-sky-700 dark:text-sky-400">
                      Vượt: +{formatCurrency(over)}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Còn lại: {formatCurrency(remain)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn("font-medium tabular-nums text-right", valueClassName)}
      >
        {value}
      </span>
    </div>
  );
}
