/** 1 cây = 10 chỉ = 100 phân. Store quantities as integer phân. */

export type GoldDisplayUnit = "cay" | "chi" | "phan";

export function toPhan(quantity: number, unit: GoldDisplayUnit): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  switch (unit) {
    case "cay":
      return Math.round(quantity * 100);
    case "chi":
      return Math.round(quantity * 10);
    case "phan":
      return Math.round(quantity);
  }
}

export function phanToChi(phan: number): number {
  return phan / 10;
}

export function formatGoldQuantity(phan: number): string {
  if (phan <= 0) return "0 chỉ";
  const cay = Math.floor(phan / 100);
  const rem = phan % 100;
  const chi = Math.floor(rem / 10);
  const p = rem % 10;
  const parts: string[] = [];
  if (cay > 0) parts.push(`${cay} cây`);
  if (chi > 0) parts.push(`${chi} chỉ`);
  if (p > 0) parts.push(`${p} phân`);
  if (parts.length === 0) parts.push("0 chỉ");
  return parts.join(" ");
}

export function formatChiDecimal(phan: number): string {
  const chi = phanToChi(phan);
  return `${chi.toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: chi % 1 === 0 ? 0 : 1,
  })} chỉ`;
}

export const GOLD_TYPE_LABELS: Record<"9999" | "18k" | "other", string> = {
  "9999": "Vàng 9999",
  "18k": "Vàng 18K",
  other: "Khác",
};

export const ASSET_TYPE_LABELS: Record<
  "cash" | "bank" | "wallet" | "gold" | "other",
  string
> = {
  cash: "Tiền mặt",
  bank: "Ngân hàng",
  wallet: "Ví / tài khoản khác",
  gold: "Vàng",
  other: "Tài sản khác",
};
