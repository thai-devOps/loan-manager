import type {
  FinanceCategory,
  FinanceExpenseCategory,
  FinanceIncomeCategory,
  FinanceTransactionType,
} from "@/types/finance";

export const INCOME_CATEGORIES: {
  value: FinanceIncomeCategory;
  label: string;
}[] = [
  { value: "salary", label: "Lương" },
  { value: "bonus", label: "Thưởng" },
  { value: "business", label: "Kinh doanh" },
  { value: "other_income", label: "Thu nhập khác" },
];

export const EXPENSE_CATEGORIES: {
  value: FinanceExpenseCategory;
  label: string;
}[] = [
  { value: "housing", label: "Nhà ở" },
  { value: "food", label: "Ăn uống" },
  { value: "transport", label: "Đi lại" },
  { value: "family", label: "Gia đình" },
  { value: "shopping", label: "Mua sắm" },
  { value: "bills", label: "Hóa đơn" },
  { value: "electricity", label: "Hóa đơn điện" },
  { value: "water", label: "Hóa đơn nước" },
  { value: "wifi", label: "Hóa đơn wifi" },
  { value: "entertainment", label: "Giải trí" },
  { value: "health", label: "Sức khỏe" },
  { value: "other_expense", label: "Khác" },
];

export function categoriesForType(type: FinanceTransactionType) {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function categoryLabel(category: FinanceCategory | string): string {
  const all = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
  return all.find((c) => c.value === category)?.label ?? category;
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
] as const;

export function paymentMethodLabel(value?: string): string {
  if (!value) return "—";
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}
