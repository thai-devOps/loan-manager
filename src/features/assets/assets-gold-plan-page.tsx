import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, StatCard } from "@/components/common/status-badges";
import { StatCardsSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoldPlanFormDialog } from "@/features/assets/components/gold-plan-form-dialog";
import { GoldPlanCard } from "@/features/assets/components/gold-plan-card";
import {
  useAssetSummaryQuery,
  useGoldPlanQuery,
  useGoldPricesLatestQuery,
  useGoldPurchasesQuery,
} from "@/api/queries";
import { formatCurrency } from "@/lib/currency";
import { currentMonthKey } from "@/features/finance/lib/calculations";
import { normalizeGoldPlan } from "@/features/assets/lib/calculations";
import { computeGoldPlanMetrics } from "@/features/assets/lib/gold-plan-metrics";
import {
  formatChiDecimal,
  formatGoldQuantity,
} from "@/features/assets/lib/gold-units";
import { createGoldPriceService } from "@/features/assets/lib/gold-price-service";
import { resolveReferenceBuyPrice, buildGoldPriceMapFromMarket, estimatePurchasesMarketValue, formatBranchLabel } from "@/features/assets/lib/resolve-reference-price";
import { EMPTY_ARRAY } from "@/lib/empty";
import { cn } from "@/lib/utils";

export function AssetsGoldPlanPage() {
  const summaryQ = useAssetSummaryQuery();
  const purchasesQ = useGoldPurchasesQuery();
  const planQ = useGoldPlanQuery();
  const pricesQ = useGoldPricesLatestQuery(true);
  const [planOpen, setPlanOpen] = useState(false);

  const purchases = purchasesQ.data ?? EMPTY_ARRAY;
  const summary = summaryQ.data;
  const planRaw = planQ.data ?? summary?.plan ?? null;
  const plan = planRaw ? normalizeGoldPlan(planRaw) : null;
  const month = currentMonthKey();

  const metrics = useMemo(() => {
    if (!plan || !summary) return null;
    const goldType = plan.goldType;
    const priceService = createGoldPriceService(
      summary.settings.goldReferencePricePerChi,
    );
    const fallback = goldType
      ? priceService.getCurrentGoldPrice(goldType)
      : 0;
    const { pricePerChi } = resolveReferenceBuyPrice({
      goldType,
      referenceSourceCode: plan.referenceSourceCode,
      market: pricesQ.data,
      fallbackPricePerChi: fallback,
    });
    return computeGoldPlanMetrics(plan, purchases, pricePerChi, month);
  }, [plan, purchases, summary, month, pricesQ.data]);

  const valuation = useMemo(() => {
    if (!summary) {
      return { goldValue: 0, goldDifference: 0, anyFromMarket: false };
    }
    const { prices, anyFromMarket } = buildGoldPriceMapFromMarket(
      summary.settings.goldReferencePricePerChi,
      pricesQ.data,
    );
    const fromPurchases = estimatePurchasesMarketValue(
      purchases,
      pricesQ.data,
      prices,
    );
    return {
      goldValue: fromPurchases.goldValue,
      goldDifference: fromPurchases.goldDifference,
      anyFromMarket: anyFromMarket || Boolean(pricesQ.data?.prices?.length),
    };
  }, [summary, pricesQ.data, purchases]);

  function formatEstimateQty(phan: number | null): string {
    if (phan == null || phan <= 0) return "—";
    const chi = phan / 10;
    if (chi >= 1) {
      return `~${chi.toLocaleString("vi-VN", {
        maximumFractionDigits: 2,
      })} chỉ / tháng`;
    }
    return `~${phan.toLocaleString("vi-VN", {
      maximumFractionDigits: 2,
    })} phân / tháng`;
  }

  function formatEstimateMonths(months: number | null): string {
    if (months == null) return "Cần giá tham chiếu để ước tính";
    return `≈ ${months.toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} tháng còn lại`;
  }

  if (summaryQ.isLoading || purchasesQ.isLoading || planQ.isLoading) {
    return <StatCardsSkeleton />;
  }

  if (summaryQ.isError || !summary) {
    return (
      <EmptyState
        title="Không thể tải dữ liệu kế hoạch"
        description="Thử lại sau vài giây."
        action={
          <Button variant="outline" onClick={() => void summaryQ.refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Kế hoạch vàng</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tích lũy vàng theo mục tiêu, ngân sách và tiến độ thực tế
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/assets/gold">Giao dịch vàng</Link>
          </Button>
          <Button size="sm" onClick={() => setPlanOpen(true)}>
            {plan ? "Sửa kế hoạch" : "+ Tạo kế hoạch"}
          </Button>
        </div>
      </div>

      {plan && metrics?.hasQuantityTarget && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Tiến độ"
            value={`${formatChiDecimal(metrics.accumulatedPhan)} / ${formatChiDecimal(metrics.targetPhan)}`}
            hint={`${metrics.progressPercent}% · theo số lượng vàng`}
          />
          <StatCard
            title="Còn thiếu"
            value={formatGoldQuantity(metrics.remainingPhan)}
            hint={
              metrics.goalMet
                ? "Đã đạt mục tiêu"
                : "Cần mua thêm để hoàn thành"
            }
          />
          <StatCard
            title="Ngân sách / tháng"
            value={formatCurrency(metrics.monthlyBudget)}
            hint={`Ngày nhắc: ${plan.plannedPurchaseDay} hàng tháng`}
          />
          <StatCard
            title="Ước tính"
            value={formatEstimateQty(metrics.estimatedMonthlyPhan)}
            hint={formatEstimateMonths(metrics.estimatedMonths)}
          />
        </div>
      )}

      <GoldPlanCard
        plan={plan}
        purchases={purchases}
        summary={summary}
        currentMonth={month}
        onEdit={() => setPlanOpen(true)}
      />

      {plan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Định giá vàng</CardTitle>
            <p className="text-xs text-muted-foreground">
              Tách biệt với tiến độ kế hoạch — tiến độ dựa trên số lượng, định
              giá theo giá mua PNJ
              {valuation.anyFromMarket && pricesQ.data?.branch
                ? ` · ${formatBranchLabel(pricesQ.data.branch)}`
                : " (hoặc giá thủ công nếu chưa có PNJ)"}
              .
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ValuationCell
                label="Giá vốn vàng"
                value={formatCurrency(summary.goldCost)}
              />
              <ValuationCell
                label="Giá trị hiện tại"
                value={formatCurrency(valuation.goldValue)}
              />
              <ValuationCell
                label="Chênh lệch"
                value={`${valuation.goldDifference >= 0 ? "+" : ""}${formatCurrency(valuation.goldDifference)}`}
                valueClassName={
                  valuation.goldDifference >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400"
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      <GoldPlanFormDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        existing={plan}
        purchases={purchases}
      />
    </div>
  );
}

function ValuationCell({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-semibold tabular-nums tracking-tight",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}
