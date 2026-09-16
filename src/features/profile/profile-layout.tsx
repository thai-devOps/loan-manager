import { Outlet, NavLink } from "react-router-dom";
import { RefreshCw, Settings, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const PROFILE_NAV = [
  { title: "Tài khoản", href: "/profile", icon: UserRound, end: true as const },
  { title: "Cài đặt", href: "/profile/settings", icon: Settings },
  { title: "Đồng bộ", href: "/profile/sync", icon: RefreshCw },
];

export function ProfileLayout() {
  return <Outlet />;
}

/** Profile section tabs — always visible (no module sidebar on /profile). */
export function ProfileModuleChrome() {
  return (
    <nav
      aria-label="Menu tài khoản"
      className="sticky top-14 z-20 shrink-0 border-b border-border bg-background/95"
    >
      <div className="flex gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PROFILE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={"end" in item ? item.end : false}
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
  );
}
