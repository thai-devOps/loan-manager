import {
  CarFront,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  Users,
  Wallet,
  WalletCards,
  HandCoins,
  CalendarClock,
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Landmark,
  PieChart,
  Coins,
  List,
  CalendarCheck,
  Shield,
  type LucideIcon,
} from "lucide-react";

export type AppFeatureId =
  | "loans"
  | "finance"
  | "analytics"
  | "assets"
  | "rideSite"
  | "rideOps"
  | "accessAdmin";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  end?: boolean;
  /** Hide nav item unless user has module view access */
  accessModule?: string;
  /** Hide nav item unless user has this permission */
  permission?: string;
}

export interface AppFeature {
  id: AppFeatureId;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  nav: NavItem[];
  /** Module code for hasModuleAccess, or special permission check */
  accessModule?: string;
  accessAnyOf?: string[];
}

export interface MobileBottomTab {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  /** Elevated center FAB (Apps hub). */
  fab?: boolean;
  /** Match active state for this tab. */
  isActive: (pathname: string) => boolean;
  /** Hide tab unless user has module view access (apps FAB always shown). */
  accessModule?: string;
}

export const APP_FEATURES: AppFeature[] = [
  {
    id: "loans",
    title: "Khoản cho vay",
    description: "Người vay, khoản vay, thu tiền và lịch thu",
    href: "/dashboard",
    icon: Wallet,
    accessModule: "loan",
    nav: [
      { title: "Tổng quan", href: "/dashboard", icon: LayoutDashboard, end: true },
      { title: "Người vay", href: "/borrowers", icon: Users },
      { title: "Khoản vay", href: "/loans", icon: Wallet },
      { title: "Thu tiền", href: "/payments", icon: HandCoins },
      { title: "Lịch thu", href: "/schedules", icon: CalendarClock },
      { title: "Giao dịch", href: "/transactions", icon: ArrowLeftRight },
    ],
  },
  {
    id: "finance",
    title: "Tài chính",
    description: "Theo dõi thu chi cá nhân theo tháng",
    href: "/finance",
    icon: WalletCards,
    accessModule: "finance",
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
    accessModule: "asset",
    nav: [
      { title: "Tổng quan", href: "/assets", icon: LayoutDashboard, end: true },
      { title: "Danh mục tài sản", href: "/assets/holdings", icon: List },
      { title: "Phân bổ vốn", href: "/assets/allocation", icon: PieChart },
      {
        title: "Giao dịch vàng",
        href: "/assets/gold",
        icon: Coins,
        accessModule: "gold",
      },
      {
        title: "Kế hoạch vàng",
        href: "/assets/gold-plan",
        icon: CalendarCheck,
        accessModule: "gold",
      },
    ],
  },
  {
    id: "analytics",
    title: "Phân tích",
    description: "Báo cáo và biểu đồ hiệu quả cho vay",
    href: "/reports",
    icon: BarChart3,
    accessModule: "report",
    nav: [
      {
        title: "Báo cáo",
        href: "/reports",
        icon: BarChart3,
        end: true,
        permission: "report.loan.view",
      },
    ],
  },
  {
    id: "rideSite",
    title: "Website đặt chuyến",
    description: "Trang khách hàng đặt xe riêng có tài xế",
    href: "/ride",
    icon: Globe,
    nav: [
      { title: "Trang chủ", href: "/ride", icon: Globe, end: true },
    ],
  },
  {
    id: "rideOps",
    title: "Vận hành xe",
    description: "Booking, xe, tài xế — dịch vụ xe có tài xế",
    href: "/admin/dashboard",
    icon: CarFront,
    accessModule: "fleet",
    nav: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    id: "accessAdmin",
    title: "Quản trị",
    description: "Người dùng, vai trò và phân quyền truy cập",
    href: "/admin/users",
    icon: Shield,
    accessAnyOf: ["user.view", "role.view"],
    nav: [
      {
        title: "Người dùng",
        href: "/admin/users",
        icon: Users,
        end: true,
        permission: "user.view",
      },
      {
        title: "Vai trò",
        href: "/admin/roles",
        icon: Shield,
        permission: "role.view",
      },
    ],
  },
];

export function canAccessFeature(
  feature: AppFeature,
  opts: {
    hasModuleAccess: (module: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
  },
): boolean {
  if (feature.accessAnyOf?.length) {
    return opts.hasAnyPermission(feature.accessAnyOf);
  }
  if (feature.accessModule) {
    return opts.hasModuleAccess(feature.accessModule);
  }
  return true;
}

export function filterNavItems(
  items: NavItem[],
  opts: {
    hasModuleAccess: (module: string) => boolean;
    hasPermission: (permission: string) => boolean;
  },
): NavItem[] {
  return items.filter((item) => {
    if (item.permission && !opts.hasPermission(item.permission)) return false;
    if (item.accessModule && !opts.hasModuleAccess(item.accessModule)) {
      return false;
    }
    return true;
  });
}

export function getFeatureById(id: AppFeatureId): AppFeature {
  return APP_FEATURES.find((f) => f.id === id)!;
}

export function getFeatureFromPath(pathname: string): AppFeature | null {
  if (pathname === "/apps" || pathname.startsWith("/apps/")) return null;
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return null;
  if (pathname === "/ride" || pathname.startsWith("/ride/")) return null;
  if (pathname === "/login" || pathname.startsWith("/login")) return null;
  if (
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/roles") ||
    pathname.startsWith("/admin/access-control") ||
    pathname.startsWith("/admin/audit-logs")
  ) {
    return getFeatureById("accessAdmin");
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  if (pathname === "/finance" || pathname.startsWith("/finance/")) {
    return getFeatureById("finance");
  }
  if (pathname === "/assets" || pathname.startsWith("/assets/")) {
    return getFeatureById("assets");
  }
  if (pathname === "/reports" || pathname.startsWith("/reports/")) {
    return getFeatureById("analytics");
  }
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/borrowers") ||
    pathname.startsWith("/loans") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/schedules") ||
    pathname.startsWith("/transactions")
  ) {
    return getFeatureById("loans");
  }
  return null;
}

/** Bottom tab order: Cho vay · Tài chính · Ứng dụng (FAB) · Tài sản · Phân tích */
export const MOBILE_BOTTOM_TABS: MobileBottomTab[] = [
  {
    id: "loans",
    title: "Cho vay",
    href: "/dashboard",
    icon: Wallet,
    accessModule: "loan",
    isActive: (pathname) => getFeatureFromPath(pathname)?.id === "loans",
  },
  {
    id: "finance",
    title: "Tài chính",
    href: "/finance",
    icon: WalletCards,
    accessModule: "finance",
    isActive: (pathname) => getFeatureFromPath(pathname)?.id === "finance",
  },
  {
    id: "apps",
    title: "Ứng dụng",
    href: "/apps",
    icon: LayoutGrid,
    fab: true,
    isActive: (pathname) =>
      pathname === "/apps" || pathname.startsWith("/apps/"),
  },
  {
    id: "assets",
    title: "Tài sản",
    href: "/assets",
    icon: Landmark,
    accessModule: "asset",
    isActive: (pathname) => getFeatureFromPath(pathname)?.id === "assets",
  },
  {
    id: "analytics",
    title: "Phân tích",
    href: "/reports",
    icon: BarChart3,
    accessModule: "report",
    isActive: (pathname) => getFeatureFromPath(pathname)?.id === "analytics",
  },
];

/** Detail routes where mobile feature sub-nav should be hidden. */
export function isFeatureDetailPath(pathname: string): boolean {
  return (
    /^\/borrowers\/[^/]+$/.test(pathname) || /^\/loans\/[^/]+$/.test(pathname)
  );
}
