import { describe, expect, it } from "vitest";
import {
  paydayInMonth,
  resolveDateRangePreset,
  resolveSalaryCycleRange,
} from "@/features/finance/lib/date-range";

function d(y: number, m: number, day: number) {
  return new Date(y, m - 1, day);
}

describe("salary cycle date range", () => {
  it("clamps payday to month length", () => {
    expect(paydayInMonth(2026, 1, 28).getDate()).toBe(28); // Feb
    expect(paydayInMonth(2026, 1, 31).getDate()).toBe(28); // clamped via max 28
  });

  it("resolves current cycle after payday this month", () => {
    // payday 5, today Mar 20 → Mar 5 … Apr 4
    expect(resolveSalaryCycleRange(5, d(2026, 3, 20), "this")).toEqual({
      from: "2026-03-05",
      to: "2026-04-04",
    });
  });

  it("resolves current cycle before payday this month", () => {
    // payday 5, today Mar 3 → Feb 5 … Mar 4
    expect(resolveSalaryCycleRange(5, d(2026, 3, 3), "this")).toEqual({
      from: "2026-02-05",
      to: "2026-03-04",
    });
  });

  it("resolves last cycle as the previous payday window", () => {
    expect(resolveSalaryCycleRange(5, d(2026, 3, 20), "last")).toEqual({
      from: "2026-02-05",
      to: "2026-03-04",
    });
  });

  it("wires presets through resolveDateRangePreset", () => {
    expect(
      resolveDateRangePreset("this_salary_cycle", {
        salaryPayday: 10,
        referenceDate: d(2026, 9, 22),
      }),
    ).toEqual({ from: "2026-09-10", to: "2026-10-09" });

    expect(
      resolveDateRangePreset("last_salary_cycle", {
        salaryPayday: 10,
        referenceDate: d(2026, 9, 22),
      }),
    ).toEqual({ from: "2026-08-10", to: "2026-09-09" });
  });
});
