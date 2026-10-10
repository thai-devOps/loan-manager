import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "../access/permissions.js";
import {
  buildAssetReport,
  buildNarrative,
  canExportFinanceReport,
  canViewFinanceReport,
  chartSeries,
  eventsInRange,
  expenseBreakdown,
  filterEvents,
  incomeBreakdown,
  interestDueReport,
  isInternalTransfer,
  metricDelta,
  paginate,
  previousEquivalentRange,
  resolveReportPreset,
  salaryCycles,
  summarize,
  vnDateKey,
  type ReportEvent,
} from "./report-math.js";

function event(partial: Partial<ReportEvent> & Pick<ReportEvent, "id" | "kind" | "amount">): ReportEvent {
  return {
    date: "2026-10-10",
    ...partial,
  };
}

describe("finance report math", () => {
  it("returns zeros and no narrative when the period is empty", () => {
    const summary = summarize(eventsInRange([], "2026-10-01", "2026-10-31"));
    expect(summary.cashIn).toBe(0);
    expect(summary.netCash).toBe(0);
    expect(summary.openingCash).toBeNull();
    expect(summary.endingCash).toBeNull();
    expect(
      buildNarrative({
        summary,
        hasActivity: false,
        hasPrevious: false,
        netPercent: null,
        topExpense: null,
      }),
    ).toEqual([]);
  });

  it("sums income and expense into cash flow and actual income", () => {
    const summary = summarize([
      event({ id: "a", kind: "income", amount: 1_000_000, category: "salary" }),
      event({ id: "b", kind: "expense", amount: 200_000, category: "food" }),
    ]);
    expect(summary.cashIn).toBe(1_000_000);
    expect(summary.cashOut).toBe(200_000);
    expect(summary.netCash).toBe(800_000);
    expect(summary.actualIncome).toBe(1_000_000);
    expect(summary.actualExpense).toBe(200_000);
  });

  it("treats principal recovery as cash in but not income", () => {
    const summary = summarize([
      event({ id: "p", kind: "principal", amount: 500_000, loanId: "l1" }),
    ]);
    expect(summary.cashIn).toBe(500_000);
    expect(summary.actualIncome).toBe(0);
    expect(summary.principalCollected).toBe(500_000);
    expect(incomeBreakdown([
      event({ id: "p", kind: "principal", amount: 500_000, loanId: "l1" }),
    ])).toEqual([]);
  });

  it("counts collected interest as both cash and income", () => {
    const summary = summarize([
      event({ id: "i", kind: "interest", amount: 80_000, loanId: "l1" }),
    ]);
    expect(summary.cashIn).toBe(80_000);
    expect(summary.actualIncome).toBe(80_000);
    expect(summary.interestIncome).toBe(80_000);
    expect(incomeBreakdown([
      event({ id: "i", kind: "interest", amount: 80_000, loanId: "l1" }),
    ])[0]?.category).toBe("loan_interest");
  });

  it("splits one collection into principal and interest without double counting", () => {
    const rows = [
      event({ id: "i", kind: "interest", amount: 30_000, loanId: "l1" }),
      event({ id: "p", kind: "principal", amount: 70_000, loanId: "l1" }),
    ];
    const summary = summarize(rows);
    expect(summary.cashIn).toBe(100_000);
    expect(summary.actualIncome).toBe(30_000);
    expect(summary.interestIncome).toBe(30_000);
    expect(summary.principalCollected).toBe(70_000);
  });

  it("keeps bank-transfer payments as real income and expense", () => {
    const row = event({
      id: "t",
      kind: "income",
      amount: 50_000,
      paymentMethod: "transfer",
    });
    expect(isInternalTransfer(row)).toBe(false);
    expect(summarize([row]).actualIncome).toBe(50_000);
    const spend = event({
      id: "e",
      kind: "expense",
      amount: 20_000,
      paymentMethod: "transfer",
    });
    expect(summarize([spend]).actualExpense).toBe(20_000);
  });

  it("drops voided rows and keeps disbursement out of expenses", () => {
    const summary = summarize([
      event({ id: "v", kind: "expense", amount: 999, voided: true }),
      event({ id: "d", kind: "disbursement", amount: 1_000_000, loanId: "l1" }),
      event({ id: "e", kind: "expense", amount: 10_000 }),
    ]);
    expect(summary.cashOut).toBe(1_010_000);
    expect(summary.actualExpense).toBe(10_000);
    expect(summary.disbursed).toBe(1_000_000);
    expect(expenseBreakdown([
      event({ id: "v", kind: "expense", amount: 999, voided: true, category: "food" }),
      event({ id: "e", kind: "expense", amount: 10_000, category: "food" }),
    ])).toEqual([{ category: "food", amount: 10_000, percent: 100 }]);
  });

  it("does not invent a percent when the previous period is zero", () => {
    const delta = metricDelta(100, 0, true);
    expect(delta.percent).toBeNull();
    expect(delta.label).toBe("Kỳ trước bằng 0");
    expect(metricDelta(100, 0, false).label).toBe("Chưa có kỳ trước");
    expect(metricDelta(0, 0, false).label).toBe("Không có thay đổi");
  });

  it("includes the first and last day in Vietnam time and excludes the neighbors", () => {
    const rows = [
      event({
        id: "before",
        kind: "income",
        amount: 1,
        date: "2026-10-09T16:59:59.000Z",
      }),
      event({
        id: "start",
        kind: "income",
        amount: 2,
        date: "2026-10-09T17:00:00.000Z",
      }),
      event({
        id: "end",
        kind: "expense",
        amount: 4,
        date: "2026-10-10",
      }),
      event({
        id: "after",
        kind: "expense",
        amount: 8,
        date: "2026-10-11",
      }),
    ];
    expect(vnDateKey("2026-10-09T17:00:00.000Z")).toBe("2026-10-10");
    const summary = summarize(eventsInRange(rows, "2026-10-10", "2026-10-10"));
    expect(summary.cashIn).toBe(2);
    expect(summary.cashOut).toBe(4);
  });

  it("counts a repeated id only once", () => {
    const summary = summarize([
      event({ id: "same", kind: "income", amount: 40 }),
      event({ id: "same", kind: "income", amount: 40 }),
    ]);
    expect(summary.cashIn).toBe(40);
  });

  it("leaves opening and ending cash unknown", () => {
    const summary = summarize([
      event({ id: "a", kind: "income", amount: 10 }),
    ]);
    expect(summary.openingCash).toBeNull();
    expect(summary.endingCash).toBeNull();
    expect(summary.balanceReason).toBe("missing_opening_balance");
  });

  it("keeps a negative cash snapshot in the asset total", () => {
    const assets = buildAssetReport({
      availableCash: -25_000,
      otherAssets: 0,
      manualGold: 0,
      goldCost: 100,
      goldEstimate: 0,
      hasReferencePrice: false,
      lentCapital: 50,
    });
    expect(assets.cash).toBe(-25_000);
    expect(assets.gold).toBe(100);
    expect(assets.goldBasis).toBe("cost");
    expect(assets.totalAssets).toBe(-24_850);
    expect(assets.netWorth).toBeNull();
  });

  it("refuses the report without finance view and export without export permission", () => {
    expect(canViewFinanceReport([], [])).toBe(false);
    expect(canViewFinanceReport([PERMISSIONS.FINANCE_TRANSACTION_VIEW], [])).toBe(true);
    expect(canViewFinanceReport([], ["SUPER_ADMIN"])).toBe(true);
    expect(
      canExportFinanceReport([PERMISSIONS.FINANCE_TRANSACTION_VIEW], []),
    ).toBe(false);
    expect(
      canExportFinanceReport(
        [
          PERMISSIONS.FINANCE_TRANSACTION_VIEW,
          PERMISSIONS.FINANCE_TRANSACTION_EXPORT,
        ],
        [],
      ),
    ).toBe(true);
  });

  it("paginates a large filtered list", () => {
    const rows = Array.from({ length: 120 }, (_, index) =>
      event({
        id: `r${index}`,
        kind: index % 2 === 0 ? "income" : "expense",
        amount: index + 1,
        description: index % 2 === 0 ? "cafe" : "khac",
      }),
    );
    const filtered = filterEvents(rows, { kind: "income", q: "cafe" });
    const page = paginate(filtered, 2, 50);
    expect(page.total).toBeGreaterThan(50);
    expect(page.page).toBe(2);
    expect(page.rows.length).toBeLessThanOrEqual(50);
    expect(page.rows.every((row) => row.kind === "income")).toBe(true);
  });

  it("resolves calendar presets and the previous window", () => {
    expect(resolveReportPreset("this_month", "2026-10-10")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(resolveReportPreset("last_quarter", "2026-10-10")).toEqual({
      from: "2026-07-01",
      to: "2026-09-30",
    });
    expect(previousEquivalentRange("2026-10-01", "2026-10-31")).toEqual({
      from: "2026-08-31",
      to: "2026-09-30",
    });
    const series = chartSeries(
      [event({ id: "a", kind: "income", amount: 5, date: "2026-01-15" })],
      "2026-01-01",
      "2026-06-30",
    );
    expect(series.grain).toBe("month");
    expect(series.points).toHaveLength(6);
  });

  it("separates overdue interest from upcoming schedules", () => {
    const report = interestDueReport(
      [
        { loanId: "l1", amount: 100, paidAmount: 40, dueDate: "2026-10-01" },
        { loanId: "l2", amount: 50, paidAmount: 50, dueDate: "2026-09-01" },
        { loanId: "l3", amount: 20, paidAmount: 0, dueDate: "2026-10-12" },
        { loanId: "l4", amount: 20, paidAmount: 0, dueDate: "2026-11-01" },
      ],
      "2026-10-10",
    );
    expect(report.dueUnpaid).toBe(60);
    expect(report.overdue.map((row) => row.loanId)).toEqual(["l1"]);
    expect(report.upcoming.map((row) => row.loanId)).toEqual(["l3"]);
  });

  it("groups cash flow by salary cycle and skips empty ones", () => {
    const report = salaryCycles(
      [
        event({ id: "in", kind: "income", amount: 1_000_000, date: "2026-08-15" }),
        event({ id: "out", kind: "disbursement", amount: 300_000, date: "2026-08-12" }),
        event({ id: "live", kind: "expense", amount: 40_000, date: "2026-08-18" }),
        event({ id: "only-loan", kind: "disbursement", amount: 9_000_000, date: "2026-09-15" }),
        event({ id: "i", kind: "interest", amount: 50_000, date: "2026-08-16" }),
        event({ id: "p", kind: "principal", amount: 100_000, date: "2026-08-16" }),
        event({ id: "now", kind: "expense", amount: 200_000, date: "2026-10-10" }),
        event({ id: "void", kind: "expense", amount: 9_999, date: "2026-08-20", voided: true }),
      ],
      10,
      "2026-10-10",
      true,
    );
    expect(report.cycles.map((cycle) => cycle.from)).toEqual(["2026-08-10", "2026-10-10"]);
    expect(report.cycles[0]).toMatchObject({
      to: "2026-09-09",
      label: "10/08/2026 – 09/09/2026",
      current: false,
      cashIn: 1_150_000,
      cashOut: 40_000,
      netCash: 1_110_000,
      loanCollected: 150_000,
    });
    expect(report.cycles[1]).toMatchObject({
      to: "2026-10-10",
      label: "10/10/2026 – 10/10/2026 · đang chạy",
      current: true,
      cashIn: 0,
      cashOut: 200_000,
      netCash: -200_000,
      loanCollected: 0,
    });
    expect(report.totals).toEqual({
      cashIn: 1_150_000,
      cashOut: 240_000,
      netCash: 910_000,
      loanCollected: 150_000,
    });
  });

  it("hides loan collections when loan events are out of scope", () => {
    const report = salaryCycles(
      [event({ id: "i", kind: "interest", amount: 80_000, date: "2026-10-01" })],
      10,
      "2026-10-10",
      false,
    );
    expect(report.cycles[0]?.loanCollected).toBeNull();
    expect(report.totals.loanCollected).toBeNull();
    expect(report.cycles[0]?.cashIn).toBe(80_000);
  });
});
