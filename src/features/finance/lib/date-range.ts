import {
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

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

export type DateRangeValue = {
  from: string;
  to: string;
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
  { value: "custom", label: "Tuỳ chọn" },
];

const WEEK_OPTS = { weekStartsOn: 1 as const }; // Monday

function vnToday(): Date {
  const [y, m, d] = todayDateInput().split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Resolve absolute from/to (yyyy-MM-dd) for a preset. Custom keeps existing range. */
export function resolveDateRangePreset(
  preset: DateRangePreset,
  custom?: DateRangeValue,
): DateRangeValue {
  const today = vnToday();

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
    case "custom": {
      if (custom?.from && custom?.to) {
        return custom.from <= custom.to
          ? custom
          : { from: custom.to, to: custom.from };
      }
      return resolveDateRangePreset("this_month");
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
  if (preset && preset !== "custom") {
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
