import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  formatDateDisplay,
  parseDateInputValue,
  toDateInputValue,
} from "@/components/ui/date-picker";
import { todayDateInput } from "@/lib/date";
import {
  DEFAULT_SALARY_PAYDAY,
  MAX_SALARY_PAYDAY,
  MIN_SALARY_PAYDAY,
} from "@/features/finance/lib/finance-prefs";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_salary_cycle"
  | "last_salary_cycle"
  | "custom";

export type DateRangeValue = {
  from: string;
  to: string;
};

export type ResolveDateRangeOptions = {
  custom?: DateRangeValue;
  /** Day of month salary is paid (1–28). */
  salaryPayday?: number;
  /** Override "today" (local calendar date) for tests. */
  referenceDate?: Date;
};

export const DATE_RANGE_PRESET_OPTIONS: {
  value: DateRangePreset;
  label: string;
}[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "this_week", label: "Tuần này" },
  { value: "last_week", label: "Tuần trước" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "this_salary_cycle", label: "Chu kỳ lương này" },
  { value: "last_salary_cycle", label: "Chu kỳ lương trước" },
  { value: "custom", label: "Tuỳ chọn" },
];

const WEEK_OPTS = { weekStartsOn: 1 as const }; // Monday

export function isSalaryCyclePreset(preset: DateRangePreset): boolean {
  return preset === "this_salary_cycle" || preset === "last_salary_cycle";
}

function vnToday(): Date {
  const [y, m, d] = todayDateInput().split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function clampPayday(day: number): number {
  if (!Number.isFinite(day)) return DEFAULT_SALARY_PAYDAY;
  return Math.min(MAX_SALARY_PAYDAY, Math.max(MIN_SALARY_PAYDAY, Math.round(day)));
}

/** Payday date in a given calendar month, clamped to month length. */
export function paydayInMonth(year: number, monthIndex: number, payday: number): Date {
  const day = clampPayday(payday);
  const last = endOfMonth(new Date(year, monthIndex, 1)).getDate();
  return new Date(year, monthIndex, Math.min(day, last));
}

/**
 * Salary cycle: from payday (inclusive) to the day before next payday (inclusive).
 * Example payday=5, today=2026-03-20 → 2026-03-05 … 2026-04-04
 */
export function resolveSalaryCycleRange(
  payday: number,
  referenceDate: Date,
  which: "this" | "last" = "this",
): DateRangeValue {
  const day = clampPayday(payday);
  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  const thisMonthPayday = paydayInMonth(y, m, day);

  let cycleStart: Date;
  let nextPayday: Date;

  if (referenceDate >= thisMonthPayday) {
    cycleStart = thisMonthPayday;
    const nextMonth = addMonths(thisMonthPayday, 1);
    nextPayday = paydayInMonth(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      day,
    );
  } else {
    const prevMonth = subMonths(thisMonthPayday, 1);
    cycleStart = paydayInMonth(
      prevMonth.getFullYear(),
      prevMonth.getMonth(),
      day,
    );
    nextPayday = thisMonthPayday;
  }

  if (which === "last") {
    const lastEnd = subDays(cycleStart, 1);
    const prevMonth = subMonths(cycleStart, 1);
    const lastStart = paydayInMonth(
      prevMonth.getFullYear(),
      prevMonth.getMonth(),
      day,
    );
    return {
      from: toDateInputValue(lastStart),
      to: toDateInputValue(lastEnd),
    };
  }

  return {
    from: toDateInputValue(cycleStart),
    to: toDateInputValue(subDays(nextPayday, 1)),
  };
}

/** Resolve absolute from/to (yyyy-MM-dd) for a preset. Custom keeps existing range. */
export function resolveDateRangePreset(
  preset: DateRangePreset,
  options?: ResolveDateRangeOptions,
): DateRangeValue {
  const today = options?.referenceDate ?? vnToday();
  const custom = options?.custom;
  const salaryPayday = clampPayday(
    options?.salaryPayday ?? DEFAULT_SALARY_PAYDAY,
  );

  switch (preset) {
    case "today": {
      const key = toDateInputValue(today);
      return { from: key, to: key };
    }
    case "yesterday": {
      const key = toDateInputValue(subDays(today, 1));
      return { from: key, to: key };
    }
    case "this_week":
      return {
        from: toDateInputValue(startOfWeek(today, WEEK_OPTS)),
        to: toDateInputValue(endOfWeek(today, WEEK_OPTS)),
      };
    case "last_week": {
      const last = subWeeks(today, 1);
      return {
        from: toDateInputValue(startOfWeek(last, WEEK_OPTS)),
        to: toDateInputValue(endOfWeek(last, WEEK_OPTS)),
      };
    }
    case "this_month":
      return {
        from: toDateInputValue(startOfMonth(today)),
        to: toDateInputValue(endOfMonth(today)),
      };
    case "last_month": {
      const prev = subMonths(today, 1);
      return {
        from: toDateInputValue(startOfMonth(prev)),
        to: toDateInputValue(endOfMonth(prev)),
      };
    }
    case "this_salary_cycle":
      return resolveSalaryCycleRange(salaryPayday, today, "this");
    case "last_salary_cycle":
      return resolveSalaryCycleRange(salaryPayday, today, "last");
    case "custom": {
      if (custom?.from && custom?.to) {
        return custom.from <= custom.to
          ? custom
          : { from: custom.to, to: custom.from };
      }
      return resolveDateRangePreset("this_month", options);
    }
  }
}

export function dateRangePresetLabel(preset: DateRangePreset): string {
  return (
    DATE_RANGE_PRESET_OPTIONS.find((o) => o.value === preset)?.label ?? preset
  );
}

/** Human-readable range for stat hints. */
export function formatDateRangeLabel(
  from: string,
  to: string,
  preset?: DateRangePreset,
): string {
  // Salary cycles: show concrete dates so the payday window is clear.
  if (preset && preset !== "custom" && !isSalaryCyclePreset(preset)) {
    return dateRangePresetLabel(preset);
  }
  if (from === to) return formatDateDisplay(from);
  return `${formatDateDisplay(from)} – ${formatDateDisplay(to)}`;
}

/** Calendar month key (yyyy-MM) used to anchor charts — month of range end. */
export function anchorMonthKey(to: string): string {
  return to.slice(0, 7);
}

/** Previous period with the same length, ending the day before `from`. */
export function previousEquivalentRange(
  from: string,
  to: string,
): DateRangeValue {
  const fromD = parseDateInputValue(from);
  const toD = parseDateInputValue(to);
  if (!fromD || !toD) return { from, to };
  const days = differenceInCalendarDays(toD, fromD);
  const prevTo = subDays(fromD, 1);
  const prevFrom = subDays(prevTo, days);
  return {
    from: toDateInputValue(prevFrom),
    to: toDateInputValue(prevTo),
  };
}

export function defaultTransactionDateForRange(
  from: string,
  to: string,
): string {
  const today = todayDateInput();
  if (today >= from && today <= to) return today;
  return to;
}

/** Filter finance items by inclusive yyyy-MM-dd bounds. */
export function filterByDateRange<T extends { date: string }>(
  items: T[],
  from: string,
  to: string,
): T[] {
  return items.filter((t) => t.date >= from && t.date <= to);
}

export function monthKeyFromDateInput(date: string): string {
  return date.slice(0, 7);
}

export function formatMonthShort(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  return format(parseDateInputValue(`${month}-01`) ?? new Date(), "MM/yy");
}
