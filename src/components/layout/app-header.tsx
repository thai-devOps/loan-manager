import { Menu, PanelLeftClose, PanelLeft, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LogoutButton,
  SidebarNav,
} from "@/components/layout/sidebar";
import { getFeatureFromPath } from "@/components/layout/nav-items";
import { useUiStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";

interface AppHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AppHeader({ title, description, actions }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const feature = getFeatureFromPath(location.pathname);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const logout = useAuthStore((s) => s.logout);

  function handleLogout() {
    logout();
    void navigate("/login", { replace: true });
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Mở menu"
        >
          <Menu className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          onClick={toggleSidebar}
          aria-label="Thu gọn sidebar"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold md:text-lg">
            {title}
          </h1>
          {description && (
            <p className="truncate text-xs text-muted-foreground md:text-sm">
              {description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            Đăng xuất
          </Button>
        </div>
      </header>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex w-[280px] flex-col p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>{feature?.title ?? "Loan Manager"}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {feature && (
              <SidebarNav
                items={feature.nav}
                onNavigate={() => setMobileNavOpen(false)}
              />
            )}
          </div>
          <div className="border-t">
            <LogoutButton onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
