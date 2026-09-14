import {
  LayoutDashboard,
  Users,
  Wallet,
  HandCoins,
  CalendarClock,
  ArrowLeftRight,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Tổng quan", href: "/", icon: LayoutDashboard },
  { title: "Người vay", href: "/borrowers", icon: Users },
  { title: "Khoản vay", href: "/loans", icon: Wallet },
  { title: "Thu tiền", href: "/payments", icon: HandCoins },
  { title: "Lịch thu", href: "/schedules", icon: CalendarClock },
  { title: "Giao dịch", href: "/transactions", icon: ArrowLeftRight },
  { title: "Báo cáo", href: "/reports", icon: BarChart3 },
  { title: "Cài đặt", href: "/settings", icon: Settings },
];
