import {
  BarChart3,
  CalendarRange,
  CarFront,
  ClipboardList,
  LayoutDashboard,
  Receipt,
  Route,
  Settings,
  Tags,
  Users,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type RideAdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
  stub?: boolean;
};

export const RIDE_ADMIN_NAV: RideAdminNavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, end: true },
  { title: "Lịch điều phối", href: "/admin/schedule", icon: CalendarRange },
  { title: "Booking", href: "/admin/bookings", icon: ClipboardList },
  { title: "Chuyến xe", href: "/admin/trips", icon: Route },
  { title: "Xe", href: "/admin/vehicles", icon: CarFront },
  { title: "Tài xế", href: "/admin/drivers", icon: UserRound },
  { title: "Khách hàng", href: "/admin/customers", icon: Users },
  { title: "Doanh thu", href: "/admin/revenue", icon: Wallet, stub: true },
  { title: "Chi phí", href: "/admin/expenses", icon: Receipt, stub: true },
  { title: "Bảng giá", href: "/admin/pricing", icon: Tags },
  { title: "Báo cáo", href: "/admin/reports", icon: BarChart3, stub: true },
  { title: "Cài đặt", href: "/admin/settings", icon: Settings },
];
