import { formatDate } from "@/lib/date";

function normalizeTime(time?: string | null): string {
  const t = (time ?? "").trim();
  if (!t) return "00:00:00";
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(":");
    return `${h!.padStart(2, "0")}:${m}:00`;
  }
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
    const [h, m, s] = t.split(":");
    return `${h!.padStart(2, "0")}:${m}:${s}`;
  }
  return t;
}

/** Format pickup/return date + time as dd/MM/yyyy HH:mm:ss (VN). */
export function formatRideDateTime(
  date?: string | null,
  time?: string | null,
): string {
  if (!date?.trim()) return "—";
  const d = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return formatDate(`${d}T${normalizeTime(time)}+07:00`);
  }
  return formatDate(d);
}

/** Format ISO timestamp as dd/MM/yyyy HH:mm:ss (VN). */
export function formatRideTimestamp(iso?: string | null): string {
  if (!iso?.trim()) return "—";
  return formatDate(iso.trim());
}
