import type { TollItem } from "./pricing.types.js";

export function calculateTollCostV2(items?: TollItem[] | null): {
  amount: number;
  source: "MANUAL";
  items: TollItem[];
} {
  const list = (items ?? [])
    .filter((i) => i && typeof i.name === "string")
    .map((i) => ({
      name: i.name.trim() || "Phí",
      amount: Math.max(0, Math.round(Number(i.amount) || 0)),
    }));
  const amount = list.reduce((sum, i) => sum + i.amount, 0);
  return { amount, source: "MANUAL", items: list };
}
