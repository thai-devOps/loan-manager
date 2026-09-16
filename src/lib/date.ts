import {
  parseISO,
  isValid,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";

/** Vietnam standard time — always format/parse relative to this zone. */
export const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

/** Convert a Date (or now) to an ISO string for storage (UTC). */
export function toISOString(date: Date = new Date()): string {
  return date.toISOString();
}

function parseDateValue(iso: string): Date | null {
  // Date-only (yyyy-MM-dd): treat as midnight Vietnam time.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const date = parseISO(`${iso}T00:00:00+07:00`);
    return isValid(date) ? date : null;
  }
  const date = parseISO(iso);
  return isValid(date) ? date : null;
}

function getVNParts(
  date: Date,
  withTime: boolean,
): Record<string, string> {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: VN_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }
      : {}),
  };

  const parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  // Some runtimes emit "24" for midnight — normalize to "00".
  if (map.hour === "24") map.hour = "00";
  return map;
}

/** Format an ISO date/datetime for UI display in Vietnam time (dd/MM/yyyy HH:mm:ss). */
export function formatDate(iso: string): string {
  const date = parseDateValue(iso);
  if (!date) return iso;
  const p = getVNParts(date, true);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

/** Format date-only for UI (dd/MM/yyyy) — no time component. */
export function formatDateOnly(iso: string): string {
  const date = parseDateValue(iso);
  if (!date) return iso;
  const p = getVNParts(date, false);
  return `${p.day}/${p.month}/${p.year}`;
}

/** Format an ISO date-time string for UI display in Vietnam time. */
export function formatDateTime(iso: string): string {
  return formatDate(iso);
}

/** Format a period key (yyyy-MM) for display. */
export function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  return `Tháng ${Number(month)}/${year}`;
}

/** Extract yyyy-MM period from an ISO date string (Vietnam calendar). */
export function getPeriodFromISO(iso: string): string {
  const date = parseDateValue(iso);
  if (!date) return iso.slice(0, 7);
  const p = getVNParts(date, false);
  return `${p.year}-${p.month}`;
}

/** Days overdue relative to today (0 if not overdue). */
export function getDaysOverdue(dueDateISO: string, today: Date = new Date()): number {
  const due = startOfDay(parseDateValue(dueDateISO) ?? parseISO(dueDateISO));
  const now = startOfDay(today);
  if (!isValid(due)) return 0;
  const days = differenceInCalendarDays(now, due);
  return days > 0 ? days : 0;
}

/** Convert a date input value (yyyy-MM-dd) to ISO at Vietnam noon. */
export function dateInputToISO(dateInput: string): string {
  const date = parseISO(`${dateInput}T12:00:00+07:00`);
  return date.toISOString();
}

/** Convert ISO to date input value (yyyy-MM-dd) in Vietnam time. */
export function isoToDateInput(iso: string): string {
  const date = parseDateValue(iso);
  if (!date) return "";
  const p = getVNParts(date, false);
  return `${p.year}-${p.month}-${p.day}`;
}

export function todayDateInput(): string {
  return isoToDateInput(new Date().toISOString());
}
