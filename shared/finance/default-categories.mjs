/** Default slugs. Keep in sync with category-catalog.ts DEFAULT_FINANCE_CATEGORIES. */
export const DEFAULT_FINANCE_CATEGORIES = [
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
