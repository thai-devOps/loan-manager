/**
 * Format a number as Vietnamese đồng currency for display.
 * Amounts are stored as numbers in the database; format only at render time.
 *
 * @example formatCurrency(3000000) => "3.000.000 ₫"
 */
export function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
  return `${formatted} ₫`;
}

/** Format digits for money inputs (no currency symbol). */
export function formatCurrencyInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function parseCurrencyInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return 0;
  return Number(digits);
}
