import { PanelLeftClose, PanelLeft, UserRound, LayoutGrid, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { SyncStatusIndicator } from "@/components/common/sync-status-indicator";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";

interface AppHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

function isProfilePath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

export function AppHeader({ title, description, actions }: AppHeaderProps) {
  const location = useLocation();
  const onProfile = isProfilePath(location.pathname);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const username = useAuthStore((s) => s.session?.username);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {onProfile ? (
        <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 px-2" asChild>
          <Link to="/apps" aria-label="Quay lại menu chính">
            <ArrowLeft className="size-4" />
            <LayoutGrid className="size-4" />
            <span className="hidden sm:inline">Ứng dụng</span>
          </Link>
        </Button>
      ) : (
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
      )}
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
        <SyncStatusIndicator />
        <ThemeToggle />
        <Button variant="outline" size="icon" asChild>
          <Link
            to="/profile"
            aria-label="Tài khoản"
            title={username ? `Tài khoản · ${username}` : "Tài khoản"}
          >
            <UserRound className="size-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
