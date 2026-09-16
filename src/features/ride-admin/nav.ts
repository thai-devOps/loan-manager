import {
  BarChart3,
  CarFront,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  Receipt,
  Route,
  Settings,
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
  { title: "Booking", href: "/admin/bookings", icon: ClipboardList },
  { title: "Chuyến xe", href: "/admin/trips", icon: Route, stub: true },
  { title: "Xe", href: "/admin/vehicles", icon: CarFront },
  { title: "Tài xế", href: "/admin/drivers", icon: UserRound },
  { title: "Khách hàng", href: "/admin/customers", icon: Users, stub: true },
  { title: "Doanh thu", href: "/admin/revenue", icon: Wallet, stub: true },
  { title: "Chi phí", href: "/admin/expenses", icon: Receipt, stub: true },
  { title: "Bảng giá", href: "/admin/pricing", icon: MapPinned, stub: true },
  { title: "Báo cáo", href: "/admin/reports", icon: BarChart3, stub: true },
  { title: "Cài đặt", href: "/admin/settings", icon: Settings, stub: true },
];
