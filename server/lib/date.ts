import {
  format,
  parseISO,
  isValid,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";
import { vi } from "date-fns/locale";

/** Convert a Date (or now) to an ISO string for IndexedDB storage. */
export function toISOString(date: Date = new Date()): string {
  return date.toISOString();
}

/** Format an ISO date string for UI display (dd/MM/yyyy). */
export function formatDate(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, "dd/MM/yyyy", { locale: vi });
}

/** Format an ISO date-time string for UI display. */
export function formatDateTime(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso;
  return format(date, "dd/MM/yyyy HH:mm", { locale: vi });
}

/** Format a period key (yyyy-MM) for display. */
export function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  return `Tháng ${Number(month)}/${year}`;
}

/** Extract yyyy-MM period from an ISO date string. */
export function getPeriodFromISO(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso.slice(0, 7);
  return format(date, "yyyy-MM");
}

/** Days overdue relative to today (0 if not overdue). */
export function getDaysOverdue(dueDateISO: string, today: Date = new Date()): number {
  const due = startOfDay(parseISO(dueDateISO));
  const now = startOfDay(today);
  if (!isValid(due)) return 0;
  const days = differenceInCalendarDays(now, due);
  return days > 0 ? days : 0;
}

/** Convert a date input value (yyyy-MM-dd) to ISO at local noon. */
export function dateInputToISO(dateInput: string): string {
  const date = new Date(`${dateInput}T12:00:00`);
  return date.toISOString();
}

/** Convert ISO to date input value (yyyy-MM-dd). */
export function isoToDateInput(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}

export function todayDateInput(): string {
  return format(new Date(), "yyyy-MM-dd");
}
