import type { FinanceCategoryRecord, FinanceTransactionType } from "@/types/finance";

const FALLBACK_LABELS: Record<string, string> = {
  salary: "Lương",
  bonus: "Thưởng",
  business: "Kinh doanh",
  other_income: "Thu nhập khác",
  housing: "Nhà ở",
  food: "Ăn uống",
  transport: "Đi lại",
  family: "Gia đình",
  shopping: "Mua sắm",
  bills: "Hóa đơn",
  electricity: "Hóa đơn điện",
  water: "Hóa đơn nước",
  wifi: "Hóa đơn wifi",
  entertainment: "Giải trí",
  health: "Sức khỏe",
  other_expense: "Khác",
};

export function categoryLabel(
  category: string,
  rows?: FinanceCategoryRecord[] | null,
): string {
  const hit = rows?.find((row) => row.key === category);
  if (hit) return hit.name;
  if (rows) return category;
  return FALLBACK_LABELS[category] ?? category;
}

export function categoriesForType(
  type: FinanceTransactionType,
  rows: FinanceCategoryRecord[] | undefined,
  currentKey?: string,
) {
  const list = (rows ?? []).filter(
    (row) => row.type === type && (row.isActive || row.key === currentKey),
  );
  return list
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"))
    .map((row) => ({ value: row.key, label: row.name }));
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
] as const;

export function paymentMethodLabel(value?: string): string {
  if (!value) return "—";
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}
