import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
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

export function DesktopSidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            LM
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold leading-none">Loan Manager</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Quản lý cho vay
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className="border-t border-sidebar-border">
        <LogoutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}
