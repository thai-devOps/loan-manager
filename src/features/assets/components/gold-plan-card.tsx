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
  type MonthlyPlanStatus,
} from "@/features/assets/lib/calculations";
import { createGoldPriceService } from "@/features/assets/lib/gold-price-service";
import type { AssetSummary, GoldPlan, GoldPurchase } from "@/types/assets";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${m}/${y}`;
}

function isMonthDone(status: MonthlyPlanStatus): boolean {
  return status === "completed" || status === "exceeded";
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
  const planMonths = listPlanMonths(normalized);
  const goldType = normalized.goldType;
  const typedPurchases = goldType
    ? purchases.filter((p) => p.type === goldType)
    : purchases;
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

  const doneCount = planMonths.filter((m) => {
    const status = monthlyPlanStatus({
      month: m,
      budget: budgetForMonth(normalized, m),
      spent: monthSpend(typedPurchases, m),
      currentMonth,
      planStatus: normalized.status,
    });
    return isMonthDone(status);
  }).length;

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
          <Row
            label="Thời gian"
            value={`${formatMonthLabel(normalized.startMonth)} → ${formatMonthLabel(normalized.endMonth)}`}
          />
          {hasQty && remaining != null && remaining > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">
              Thời gian hoàn thành phụ thuộc vào giá vàng và số lượng mua thực
              tế.
            </p>
          )}
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium">Checklist tháng</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {doneCount}/{planMonths.length} tháng hoàn thành
            </p>
          </div>
          <div className="max-h-[min(28rem,60vh)] space-y-2 overflow-y-auto pr-1">
            {planMonths.map((m) => {
              const budget = budgetForMonth(normalized, m);
              const spent = monthSpend(typedPurchases, m);
              const status = monthlyPlanStatus({
                month: m,
                budget,
                spent,
                currentMonth,
                planStatus: normalized.status,
              });
              const done = isMonthDone(status);
              const isCurrent = m === currentMonth;
              const over = spent > budget ? spent - budget : 0;
              const remain = Math.max(budget - spent, 0);
              return (
                <div
                  key={m}
                  className={cn(
                    "flex gap-3 rounded-lg border px-3 py-2.5 text-sm",
                    isCurrent && "border-amber-500/50 bg-amber-50/40 dark:bg-amber-950/20",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                      done
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-muted-foreground/30 bg-background",
                    )}
                    aria-hidden
                  >
                    {done ? <Check className="size-3.5 stroke-[3]" /> : null}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        Tháng {formatMonthLabel(m)}
                        {isCurrent ? (
                          <span className="ml-1.5 text-xs font-normal text-amber-700 dark:text-amber-400">
                            (hiện tại)
                          </span>
                        ) : null}
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
                          status === "not_started" && "text-muted-foreground",
                        )}
                      >
                        {monthlyPlanStatusLabel(status)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      Mục tiêu: {formatCurrency(budget)} · Đã mua:{" "}
                      {formatCurrency(spent)}
                      {over > 0
                        ? ` · Vượt: +${formatCurrency(over)}`
                        : ` · Còn lại: ${formatCurrency(remain)}`}
                    </p>
                  </div>
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
