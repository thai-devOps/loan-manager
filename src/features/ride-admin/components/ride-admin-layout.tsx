import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { RIDE_ADMIN_NAV } from "@/features/ride-admin/nav";
import {
  RideAdminRealtimeProvider,
  RideAdminRealtimeStatus,
} from "@/features/ride-admin/realtime/ride-admin-realtime-provider";
import { PERMISSIONS } from "@/config/permissions";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

const NAV_PERMISSION: Record<string, string | undefined> = {
  "/admin/dashboard": PERMISSIONS.FLEET_DASHBOARD_VIEW,
  "/admin/schedule": PERMISSIONS.FLEET_TRIP_VIEW,
  "/admin/bookings": PERMISSIONS.FLEET_BOOKING_VIEW,
  "/admin/vehicles": PERMISSIONS.FLEET_VEHICLE_VIEW,
  "/admin/drivers": PERMISSIONS.FLEET_DRIVER_VIEW,
  "/admin/trips": PERMISSIONS.FLEET_TRIP_VIEW,
  "/admin/customers": PERMISSIONS.FLEET_CUSTOMER_VIEW,
  "/admin/pricing": PERMISSIONS.FLEET_PRICING_VIEW,
};

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const items = RIDE_ADMIN_NAV.filter((item) => {
    const perm = NAV_PERMISSION[item.href];
    if (!perm) return true;
    return hasPermission(perm);
  });

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-teal-800 text-teal-50"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              item.stub && !isActive && "opacity-70",
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          {item.title}
          {item.stub ? (
            <span className="ml-auto text-[10px] font-normal uppercase tracking-wide opacity-60">
              Soon
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}

export function RideAdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.session?.username);

  function handleLogout() {
    logout();
    void navigate("/login", { replace: true });
  }

  return (
    <RideAdminRealtimeProvider>
      <div className="flex min-h-dvh bg-background">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
          <div className="border-b border-border px-4 py-4">
            <Link to="/admin/dashboard" className="block">
              <p className="text-sm font-semibold tracking-tight">Vận hành xe</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Xe riêng + tài xế
              </p>
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="border-t border-border p-3 space-y-2">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/apps">
                <LayoutGrid className="size-4" />
                Apps hub
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Đăng xuất
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
            <div className="flex items-center gap-2 md:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Menu">
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex w-[min(100%,18rem)] flex-col p-0">
                  <SheetHeader className="border-b border-border px-4 py-4 text-left">
                    <SheetTitle>Vận hành xe</SheetTitle>
                  </SheetHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <SidebarNav onNavigate={() => setOpen(false)} />
                  </div>
                  <div className="space-y-2 border-t border-border p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <Link to="/apps" onClick={() => setOpen(false)}>
                        <LayoutGrid className="size-4" />
                        Apps hub
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="size-4" />
                      Đăng xuất
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <span className="text-sm font-semibold">Admin</span>
            </div>
            <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
              <p className="truncate text-sm text-muted-foreground">
                {username ? `Đăng nhập: ${username}` : "Quản trị vận hành"}
              </p>
              <RideAdminRealtimeStatus />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
                asChild
                aria-label="Apps hub"
              >
                <Link to="/apps">
                  <LayoutGrid className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </div>
          </header>
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </RideAdminRealtimeProvider>
  );
}
