import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  canAccessFeature,
  filterNavItems,
  getFeatureFromPath,
  type AppFeature,
  type NavItem,
} from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/common/app-logo";
import { APP_NAME } from "@/lib/brand";
import { useUiStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";

interface SidebarNavProps {
  items: NavItem[];
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({
  items,
  collapsed = false,
  onNavigate,
}: SidebarNavProps) {
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visible = filterNavItems(items, { hasModuleAccess, hasPermission });

  return (
    <nav className="flex flex-col gap-1 p-2">
      {visible.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end ?? false}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive &&
                  "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
                collapsed && "justify-center px-2",
              )
            }
            title={collapsed ? item.title : undefined}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function SwitchFeatureButton({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-3 text-sidebar-foreground",
        collapsed && "justify-center px-2",
      )}
      onClick={() => {
        onNavigate?.();
        void navigate("/apps");
      }}
      title="Đổi tính năng"
    >
      <LayoutGrid className="size-4 shrink-0" />
      {!collapsed && <span>Đổi tính năng</span>}
    </Button>
  );
}

export function LogoutButton({
  collapsed = false,
  className,
  onNavigate,
}: {
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.session?.username);

  function handleLogout() {
    onNavigate?.();
    logout();
    void navigate("/login", { replace: true });
  }

  return (
    <div className={cn("space-y-2 p-2", className)}>
      {!collapsed && username && (
        <p className="truncate px-2 text-xs text-muted-foreground">
          Đăng nhập: {username}
        </p>
      )}
      <SwitchFeatureButton collapsed={collapsed} onNavigate={onNavigate} />
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 text-sidebar-foreground",
          collapsed && "justify-center px-2",
        )}
        onClick={handleLogout}
        title="Đăng xuất"
      >
        <LogOut className="size-4 shrink-0" />
        {!collapsed && <span>Đăng xuất</span>}
      </Button>
    </div>
  );
}

function SidebarBrand({
  feature,
  collapsed,
}: {
  feature: AppFeature;
  collapsed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-14 items-center border-b border-sidebar-border px-3",
        collapsed && "justify-center px-2",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <AppLogo size="sm" className="rounded-lg" alt={APP_NAME} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-none">
              {feature.title}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {APP_NAME}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const location = useLocation();
  const feature = getFeatureFromPath(location.pathname);
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);

  if (!feature) return null;
  if (
    !canAccessFeature(feature, { hasModuleAccess, hasAnyPermission })
  ) {
    return null;
  }

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      <SidebarBrand feature={feature} collapsed={collapsed} />
      <div className="flex-1 overflow-y-auto">
        <SidebarNav items={feature.nav} collapsed={collapsed} />
      </div>
      <div className="border-t border-sidebar-border">
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
