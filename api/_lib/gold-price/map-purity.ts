import type { GoldType } from "../types.js";

const CODES_9999 = new Set(
  ["N24K", "SJC", "PNJ", "24K", "999", "9999", "RAW_9999"].map((c) =>
    c.toUpperCase(),
  ),
);
const CODES_18K = new Set(["75", "18K"].map((c) => c.toUpperCase()));

export function mapSourceCodeToGoldType(sourceCode: string): GoldType {
  const c = sourceCode.trim().toUpperCase();
  if (!c) return "other";
  if (CODES_9999.has(c)) return "9999";
  if (CODES_18K.has(c)) return "18k";
  if (c.includes("999") || c.includes("24K")) return "9999";
  if (c.includes("18") || c === "75") return "18k";
  return "other";
}
