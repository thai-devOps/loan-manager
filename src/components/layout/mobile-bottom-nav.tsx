import { NavLink, useLocation } from "react-router-dom";
import { MOBILE_BOTTOM_TABS } from "@/components/layout/nav-items";
import { prefetchFeatureRoute } from "@/lib/prefetch-feature";
import { cn } from "@/lib/utils";

/**
 * Continuous bar: flat top above side icons, modest center bump around the FAB.
 */
function NavBarShell() {
  const edge =
    "M0 38 H156 C166 38 172 28 178 20 C184 12 190 8 195 8 C200 8 206 12 212 20 C218 28 224 38 234 38 H390";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <svg
        className="absolute inset-x-0 bottom-[env(safe-area-inset-bottom,0px)] h-24 w-full text-background"
        viewBox="0 0 390 96"
        preserveAspectRatio="none"
      >
        <path fill="currentColor" d={`${edge} V96 H0 Z`} />
        <path
          fill="none"
          stroke="var(--border)"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          d={edge}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-[env(safe-area-inset-bottom,0px)] bg-background" />
    </div>
  );
}

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Menu chính"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
    >
      <div className="relative mx-auto h-[calc(6rem+env(safe-area-inset-bottom,0px))] max-w-lg">
        <NavBarShell />

        <div className="pointer-events-auto relative z-10 grid h-24 grid-cols-5 items-end px-0.5 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))]">
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.isActive(location.pathname);

            if (tab.fab) {
              return (
                <NavLink
                  key={tab.id}
                  to={tab.href}
                  onPointerDown={() => prefetchFeatureRoute(tab.href)}
                  className="relative flex flex-col items-center gap-1"
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "absolute bottom-[1.2rem] flex size-11 items-center justify-center rounded-full",
                      "bg-teal-700 text-teal-50 dark:bg-teal-600",
                      "shadow-[0_6px_14px_-4px_rgb(15_118_110_/_0.4)]",
                      "ring-[3px] ring-background",
                      "transition-transform active:scale-95",
                      active && "bg-teal-600 dark:bg-teal-500",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.25} />
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-[10px] font-medium leading-none",
                      active
                        ? "text-teal-700 dark:text-teal-300"
                        : "text-muted-foreground",
                    )}
                  >
                    {tab.title}
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={tab.id}
                to={tab.href}
                onPointerDown={() => prefetchFeatureRoute(tab.href)}
                className="relative flex flex-col items-center gap-1"
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    active
                      ? "text-teal-700 dark:text-teal-300"
                      : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "max-w-full truncate px-0.5 text-center text-[10px] font-medium leading-none",
                    active
                      ? "text-teal-700 dark:text-teal-300"
                      : "text-muted-foreground",
                  )}
                >
                  {tab.title}
                </span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 h-0.5 w-5 rounded-full bg-teal-600 dark:bg-teal-400"
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
