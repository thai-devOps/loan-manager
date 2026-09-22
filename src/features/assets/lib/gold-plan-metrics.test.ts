import { describe, expect, it } from "vitest";
import {
  computeGoldPlanMetrics,
  draftPlanFromForm,
  monthsInclusive,
} from "@/features/assets/lib/gold-plan-metrics";
import type { GoldPurchase } from "@/types/assets";

const PRICE = 14_250_000;
const BUDGET = 7_000_000;

function makePlan(
  overrides: Partial<Parameters<typeof draftPlanFromForm>[0]> & {
    targetQuantityInPhan?: number | null;
  } = {},
) {
  const { targetQuantityInPhan, ...rest } = overrides;
  return {
    ...draftPlanFromForm({
      goldType: "9999",
      referenceSourceCode: "N24K",
      targetQuantityInPhan: targetQuantityInPhan ?? 100,
      initialQuantityInPhan: 30,
      includeInitialQuantity: true,
      monthlyBudget: BUDGET,
      plannedPurchaseDay: 25,
      startMonth: "2026-10",
      endMonth: "2027-12",
      ...rest,
    }),
    ...(targetQuantityInPhan === null
      ? { targetQuantityInPhan: null }
      : {}),
  };
}

function purchase(
  quantityInPhan: number,
  purchaseDate: string,
  type: GoldPurchase["type"] = "9999",
): GoldPurchase {
  return {
    id: `p-${purchaseDate}-${quantityInPhan}`,
    type,
    quantityInPhan,
    purchasePricePerChi: PRICE,
    totalCost: Math.round((quantityInPhan / 10) * PRICE),
    purchaseDate,
    createdAt: purchaseDate,
    updatedAt: purchaseDate,
  };
}

describe("monthsInclusive", () => {
  it("counts inclusive months", () => {
    expect(monthsInclusive("2026-10", "2026-10")).toBe(1);
    expect(monthsInclusive("2026-10", "2027-11")).toBe(14);
  });
});

describe("computeGoldPlanMetrics — PNJ fractional estimate", () => {
  it("matches budget 7tr / buy 14.25tr acceptance", () => {
    const metrics = computeGoldPlanMetrics(makePlan(), [], PRICE, "2026-10");

    expect(metrics.targetChi).toBe(10);
    expect(metrics.existingChi).toBe(3);
    expect(metrics.remainingChi).toBe(7);
    expect(metrics.progressPercent).toBe(30);

    expect(metrics.estimatedChiPerMonth).toBeCloseTo(7_000_000 / 14_250_000, 5);
    expect(metrics.estimatedMonthlyPhan).toBeCloseTo(
      (7_000_000 / 14_250_000) * 10,
      4,
    );
    expect(metrics.estimatedMonths).toBeCloseTo(
      7 / (7_000_000 / 14_250_000),
      4,
    );
  });

  it("updates progress after purchasing 2 chỉ", () => {
    const metrics = computeGoldPlanMetrics(
      makePlan(),
      [purchase(20, "2026-10-15")],
      PRICE,
      "2026-10",
    );
    expect(metrics.progressPercent).toBe(50);
    expect(metrics.remainingChi).toBe(5);
  });

  it("ignores existing when includeInitialQuantity is false", () => {
    const metrics = computeGoldPlanMetrics(
      makePlan({ includeInitialQuantity: false }),
      [],
      PRICE,
      "2026-10",
    );
    expect(metrics.existingChi).toBe(0);
    expect(metrics.progressPercent).toBe(0);
  });

  it("caps progress at 100% and reports overrun", () => {
    const metrics = computeGoldPlanMetrics(
      makePlan(),
      [purchase(80, "2026-11-01")],
      PRICE,
      "2026-11",
    );
    expect(metrics.progressPercent).toBe(100);
    expect(metrics.overrunChi).toBe(1);
  });

  it("flags pace when endMonth is too soon", () => {
    const metrics = computeGoldPlanMetrics(
      makePlan({ endMonth: "2026-12" }),
      [],
      PRICE,
      "2026-10",
    );
    expect(metrics.paceOk).toBe(false);
    expect(metrics.requiredBudgetPerMonth).toBeGreaterThan(BUDGET);
  });
});
