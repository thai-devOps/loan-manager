import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, StatCard } from "@/components/common/status-badges";
import { StatCardsSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { GoldPlanFormDialog } from "@/features/assets/components/gold-plan-form-dialog";
import { GoldPlanCard } from "@/features/assets/components/gold-plan-card";
import {
  useAssetSummaryQuery,
  useGoldPlanQuery,
  useGoldPurchasesQuery,
} from "@/api/queries";
import { formatCurrency } from "@/lib/currency";
import { currentMonthKey } from "@/features/finance/lib/calculations";
import {
  budgetForMonth,
  calculateGoldGoalProgress,
  monthSpend,
  normalizeGoldPlan,
  planAccumulatedPhan,
  planHasQuantityTarget,
} from "@/features/assets/lib/calculations";
import { formatGoldQuantity } from "@/features/assets/lib/gold-units";
import { EMPTY_ARRAY } from "@/lib/empty";

export function AssetsGoldPlanPage() {
  const summaryQ = useAssetSummaryQuery();
  const purchasesQ = useGoldPurchasesQuery();
  const planQ = useGoldPlanQuery();
  const [planOpen, setPlanOpen] = useState(false);

  const purchases = purchasesQ.data ?? EMPTY_ARRAY;
  const summary = summaryQ.data;
  const planRaw = planQ.data ?? summary?.plan ?? null;
  const plan = planRaw ? normalizeGoldPlan(planRaw) : null;
  const month = currentMonthKey();

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

  const typedPurchases =
    plan?.goldType != null
      ? purchases.filter((p) => p.type === plan.goldType)
      : purchases;
  const monthBudget = plan ? budgetForMonth(plan, month) : 0;
  const monthSpent = plan ? monthSpend(typedPurchases, month) : 0;
  const planProgress =
    plan && planHasQuantityTarget(plan)
      ? calculateGoldGoalProgress(
          planAccumulatedPhan(plan, purchases),
          plan.targetQuantityInPhan!,
        )
      : plan
        ? calculateGoldGoalProgress(summary.goldCost, plan.targetAmount)
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Kế hoạch vàng</h2>
          <p className="text-sm text-muted-foreground">
            Theo dõi mục tiêu tích lũy và checklist hoàn thành từng tháng
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/assets/gold">Giao dịch vàng</Link>
          </Button>
          <Button size="sm" onClick={() => setPlanOpen(true)}>
            {plan ? "Sửa kế hoạch" : "Tạo kế hoạch"}
          </Button>
        </div>
      </div>

      {plan && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Tiến độ"
            value={planProgress != null ? `${planProgress}%` : "—"}
            hint={
              planHasQuantityTarget(plan)
                ? `${formatGoldQuantity(planAccumulatedPhan(plan, purchases))} / ${formatGoldQuantity(plan.targetQuantityInPhan!)}`
                : "Theo giá vốn"
            }
          />
          <StatCard
            title="Ngân sách / tháng"
            value={formatCurrency(plan.monthlyBudget)}
            hint={`Ngày nhắc: ${plan.plannedPurchaseDay} hàng tháng`}
          />
          <StatCard
            title="Tháng này — mục tiêu"
            value={formatCurrency(monthBudget)}
            hint={`Đã mua: ${formatCurrency(monthSpent)}`}
          />
          <StatCard
            title="Giá vốn vàng"
            value={formatCurrency(summary.goldCost)}
            hint={`Giá trị: ${formatCurrency(summary.goldValue)}`}
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

      <GoldPlanFormDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        existing={plan}
        purchases={purchases}
      />
    </div>
  );
}
