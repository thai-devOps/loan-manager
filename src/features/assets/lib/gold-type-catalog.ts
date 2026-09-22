import type { GoldType } from "@/types/assets";

const CODES_9999 = new Set(
  ["N24K", "SJC", "PNJ", "24K", "999", "9999", "RAW_9999"].map((c) =>
    c.toUpperCase(),
  ),
);
const CODES_18K = new Set(["75", "18K", "18k"].map((c) => c.toUpperCase()));

/** Map PNJ sourceCode → legacy purity bucket (for settings / plan filters). */
export function mapSourceCodeToGoldType(sourceCode: string): GoldType {
  const c = sourceCode.trim().toUpperCase();
  if (!c) return "other";
  if (CODES_9999.has(c)) return "9999";
  if (CODES_18K.has(c)) return "18k";
  if (c.includes("999") || c.includes("24K")) return "9999";
  if (c.includes("18") || c === "75") return "18k";
  return "other";
}

export function goldPurchaseLabel(p: {
  sourceCode?: string | null;
  sourceName?: string | null;
  type: GoldType;
}): string {
  if (p.sourceName?.trim()) return p.sourceName.trim();
  if (p.sourceCode?.trim()) return p.sourceCode.trim();
  const labels: Record<GoldType, string> = {
    "9999": "Vàng 9999",
    "18k": "Vàng 18K",
    other: "Khác",
  };
  return labels[p.type] ?? p.type;
}
