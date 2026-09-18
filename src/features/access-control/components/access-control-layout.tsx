import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Shield,
  Users,
  KeyRound,
  LayoutGrid,
  ScrollText,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { PERMISSIONS } from "@/config/permissions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/theme-toggle";

const NAV = [
  {
    title: "Người dùng",
    href: "/admin/users",
    icon: Users,
    permission: PERMISSIONS.USER_VIEW,
  },
  {
    title: "Vai trò",
    href: "/admin/roles",
    icon: KeyRound,
    permission: PERMISSIONS.ROLE_VIEW,
  },
  {
    title: "Ma trận quyền",
    href: "/admin/access-control",
    icon: LayoutGrid,
    permission: PERMISSIONS.ROLE_VIEW,
  },
  {
    title: "Nhật ký",
    href: "/admin/audit-logs",
    icon: ScrollText,
    permission: PERMISSIONS.SETTINGS_VIEW,
  },
] as const;

export function AccessControlLayout() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.session?.username);
  const items = NAV.filter((n) => hasPermission(n.permission));

  function handleLogout() {
    logout();
    void navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Quản trị truy cập</p>
          <p className="text-muted-foreground truncate text-xs">
            {username ? `Đăng nhập: ${username}` : "Phân quyền"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link to="/apps">
              <LayoutGrid className="size-4" />
              <span className="hidden sm:inline">Ứng dụng</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </Button>
        </div>
      </header>

      <nav
        aria-label="Mục quản trị truy cập"
        className="sticky top-14 z-20 shrink-0 border-b border-border bg-background/95 backdrop-blur md:hidden"
      >
        <div className="flex gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/admin/users"}
                className={({ isActive }) =>
                  cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-teal-700 text-teal-50 dark:bg-teal-600"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                <Icon className="size-3.5 shrink-0" />
                {item.title}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-6 pb-32 md:px-6 md:pb-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Shield className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">
                Quản trị truy cập
              </h1>
              <p className="text-muted-foreground mt-0.5 hidden text-sm sm:block">
                Người dùng, vai trò và phân quyền hệ thống
              </p>
            </div>
          </div>

          <nav
            aria-label="Mục quản trị truy cập"
            className="hidden gap-2 border-b pb-3 md:flex"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === "/admin/users"}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <Icon className="size-4" />
                  {item.title}
                </NavLink>
              );
            })}
          </nav>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
