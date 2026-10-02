import type { FuelProductCode } from "./types.js";

export const REQUIRED_FUEL_CODES = [
  "E10_RON95_III",
  "E5_RON92_II",
  "DO_005S_II",
  "DO_0001S_V",
] as const satisfies readonly FuelProductCode[];

const NAME_TO_CODE: Array<{ match: RegExp; code: FuelProductCode }> = [
  { match: /e10.*ron\s*95/i, code: "E10_RON95_III" },
  { match: /e5.*ron\s*92/i, code: "E5_RON92_II" },
  { match: /do\s*0[,.]05s/i, code: "DO_005S_II" },
  { match: /do\s*0[,.]001s/i, code: "DO_0001S_V" },
];

export function normalizeFuelProductName(rawName: string): {
  code: FuelProductCode | string;
  name: string;
  unknown: boolean;
} {
  const name = rawName.replace(/\s+/g, " ").trim();
  for (const row of NAME_TO_CODE) {
    if (row.match.test(name)) {
      return { code: row.code, name, unknown: false };
    }
  }
  return { code: "UNKNOWN", name, unknown: true };
}

/** Parse VND display like "22.330 đ" / "27.180 VNĐ" → integer. */
export function parseVndPrice(raw: string): number | null {
  if (raw == null) return null;
  const cleaned = String(raw)
    .replace(/\u00a0/g, " ")
    .replace(/[đĐ]|vnd|vnđ/gi, "")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

/** Parse change like "+100", "-1330", "100". */
export function parsePriceChange(raw: string): number | null {
  if (raw == null) return null;
  const cleaned = String(raw)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "");
  if (!cleaned || cleaned === "—" || cleaned === "-") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

/**
 * Parse PVOIL raw datetime "DD/MM/YYYY HH:mm:ss" as Asia/Ho_Chi_Minh → ISO UTC.
 */
export function parsePvoilEffectiveDate(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const m = raw
    .trim()
    .match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
    );
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] ?? 0);
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}+07:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatPvoilDisplayDate(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return raw;
  return `${m[1]!.padStart(2, "0")}-${m[2]!.padStart(2, "0")}-${m[3]}`;
}
