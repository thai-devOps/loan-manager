export const CATEGORY_ICON_NAMES = [
  "Utensils",
  "ShoppingCart",
  "Car",
  "Home",
  "Zap",
  "Heart",
  "Receipt",
  "MoreHorizontal",
  "Gamepad2",
  "Plane",
  "Book",
  "Wifi",
  "Droplets",
  "Users",
  "Sparkles",
  "Wallet",
  "Briefcase",
  "Gift",
  "Banknote",
  "Coffee",
  "Shirt",
  "Fuel",
  "Phone",
  "Baby",
  "GraduationCap",
  "Dumbbell",
  "Music",
  "Film",
  "PiggyBank",
  "Landmark",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];

export const CATEGORY_COLORS = [
  "#f43f5e",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#64748b",
] as const;

const ICON_SET = new Set<string>(CATEGORY_ICON_NAMES);

export type FinanceCategoryType = "income" | "expense";

export type DefaultFinanceCategory = {
  key: string;
  name: string;
  description: string;
  type: FinanceCategoryType;
  icon: CategoryIconName;
  color: string;
  sortOrder: number;
};

export const DEFAULT_FINANCE_CATEGORIES: DefaultFinanceCategory[] = [
  { key: "salary", name: "Lương", description: "Lương tháng", type: "income", icon: "Wallet", color: "#3b82f6", sortOrder: 0 },
  { key: "bonus", name: "Thưởng", description: "Thưởng, hoa hồng", type: "income", icon: "Gift", color: "#f59e0b", sortOrder: 1 },
  { key: "business", name: "Kinh doanh", description: "Thu từ kinh doanh", type: "income", icon: "Briefcase", color: "#22c55e", sortOrder: 2 },
  { key: "other_income", name: "Thu nhập khác", description: "Khoản thu khác", type: "income", icon: "MoreHorizontal", color: "#64748b", sortOrder: 3 },
  { key: "food", name: "Ăn uống", description: "Ăn uống, nhà hàng, cafe", type: "expense", icon: "Utensils", color: "#f43f5e", sortOrder: 0 },
  { key: "shopping", name: "Mua sắm", description: "Quần áo, giày dép, đồ dùng", type: "expense", icon: "ShoppingCart", color: "#3b82f6", sortOrder: 1 },
  { key: "transport", name: "Đi lại", description: "Xăng xe, gửi xe, taxi", type: "expense", icon: "Car", color: "#22c55e", sortOrder: 2 },
  { key: "family", name: "Gia đình", description: "Chi cho gia đình", type: "expense", icon: "Users", color: "#ec4899", sortOrder: 3 },
  { key: "housing", name: "Nhà ở", description: "Nhà, thuê nhà", type: "expense", icon: "Home", color: "#8b5cf6", sortOrder: 4 },
  { key: "bills", name: "Hóa đơn", description: "Hóa đơn chung", type: "expense", icon: "Receipt", color: "#64748b", sortOrder: 5 },
  { key: "electricity", name: "Hóa đơn điện", description: "Điện, nước dùng chung", type: "expense", icon: "Zap", color: "#f59e0b", sortOrder: 6 },
  { key: "water", name: "Hóa đơn nước", description: "Tiền nước", type: "expense", icon: "Droplets", color: "#0ea5e9", sortOrder: 7 },
  { key: "wifi", name: "Hóa đơn wifi", description: "Internet", type: "expense", icon: "Wifi", color: "#6366f1", sortOrder: 8 },
  { key: "entertainment", name: "Giải trí", description: "Du lịch, phim ảnh, thể thao", type: "expense", icon: "Gamepad2", color: "#a855f7", sortOrder: 9 },
  { key: "health", name: "Sức khỏe", description: "Thuốc, khám bệnh", type: "expense", icon: "Heart", color: "#ef4444", sortOrder: 10 },
  { key: "other_expense", name: "Khác", description: "Các khoản chi khác", type: "expense", icon: "MoreHorizontal", color: "#94a3b8", sortOrder: 11 },
];

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
}

export function isAllowedCategoryIcon(icon: string): icon is CategoryIconName {
  return ICON_SET.has(icon);
}

export function isHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

export function slugifyCategoryKey(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || "category";
}

export function decideCategoryDelete(usageCount: number): "delete" | "deactivate" {
  return usageCount > 0 ? "deactivate" : "delete";
}
