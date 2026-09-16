import { NavLink } from "react-router-dom";
import {
  filterNavItems,
  type NavItem,
} from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

interface FeatureSubNavProps {
  items: NavItem[];
  className?: string;
}

/** Horizontal in-page tabs for module sub-routes (mobile only). */
export function FeatureSubNav({ items, className }: FeatureSubNavProps) {
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const visible = filterNavItems(items, { hasModuleAccess, hasPermission });

  if (visible.length <= 1) return null;

  return (
    <nav
      aria-label="Menu tính năng"
      className={cn(
        "sticky top-14 z-20 shrink-0 border-b border-border bg-background/95 md:hidden",
        className,
      )}
    >
      <div className="flex gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end ?? false}
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
