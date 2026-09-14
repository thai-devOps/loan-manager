import {
  LayoutDashboard,
  Users,
  Wallet,
  WalletCards,
  HandCoins,
  CalendarClock,
  ArrowLeftRight,
  BarChart3,
  Settings,
  TrendingUp,
  TrendingDown,
  Landmark,
  PieChart,
  Coins,
  List,
  type LucideIcon,
} from "lucide-react";

export type AppFeatureId = "loans" | "finance" | "analytics" | "assets";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface AppFeature {
  id: AppFeatureId;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  nav: NavItem[];
}

export const APP_FEATURES: AppFeature[] = [
  {
    id: "loans",
    title: "Khoản cho vay",
    description: "Người vay, khoản vay, thu tiền và lịch thu",
    href: "/",
    icon: Wallet,
    nav: [
      { title: "Tổng quan", href: "/", icon: LayoutDashboard, end: true },
      { title: "Người vay", href: "/borrowers", icon: Users },
      { title: "Khoản vay", href: "/loans", icon: Wallet },
      { title: "Thu tiền", href: "/payments", icon: HandCoins },
      { title: "Lịch thu", href: "/schedules", icon: CalendarClock },
      { title: "Giao dịch", href: "/transactions", icon: ArrowLeftRight },
      { title: "Cài đặt", href: "/settings", icon: Settings },
    ],
  },
  {
    id: "finance",
    title: "Tài chính",
    description: "Theo dõi thu chi cá nhân theo tháng",
    href: "/finance",
    icon: WalletCards,
    nav: [
      { title: "Tổng quan", href: "/finance", icon: LayoutDashboard, end: true },
      { title: "Thu nhập", href: "/finance/income", icon: TrendingUp },
      { title: "Chi tiêu", href: "/finance/expenses", icon: TrendingDown },
      {
        title: "Giao dịch",
        href: "/finance/transactions",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    id: "assets",
    title: "Tài sản",
    description: "Phân bổ vốn và kế hoạch tích lũy vàng",
    href: "/assets",
    icon: Landmark,
    nav: [
      { title: "Tổng quan", href: "/assets", icon: LayoutDashboard, end: true },
      { title: "Danh mục tài sản", href: "/assets/holdings", icon: List },
      { title: "Phân bổ vốn", href: "/assets/allocation", icon: PieChart },
      { title: "Tích lũy vàng", href: "/assets/gold", icon: Coins },
    ],
  },
  {
    id: "analytics",
    title: "Phân tích",
    description: "Báo cáo và biểu đồ hiệu quả cho vay",
    href: "/reports",
    icon: BarChart3,
    nav: [{ title: "Báo cáo", href: "/reports", icon: BarChart3, end: true }],
  },
];

export function getFeatureById(id: AppFeatureId): AppFeature {
  return APP_FEATURES.find((f) => f.id === id)!;
}

export function getFeatureFromPath(pathname: string): AppFeature | null {
  if (pathname === "/apps" || pathname.startsWith("/apps/")) return null;
  if (pathname === "/finance" || pathname.startsWith("/finance/")) {
    return getFeatureById("finance");
  }
  if (pathname === "/assets" || pathname.startsWith("/assets/")) {
    return getFeatureById("assets");
  }
  if (pathname === "/reports" || pathname.startsWith("/reports/")) {
    return getFeatureById("analytics");
  }
  return getFeatureById("loans");
}
