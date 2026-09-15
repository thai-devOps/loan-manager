import { NavLink, useLocation } from "react-router-dom";
import { MOBILE_BOTTOM_TABS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/**
 * Opaque bar body + center arch rising UP.
 * Side tabs sit only in the solid body so the top edge never cuts icons.
 */
function NavBarShell() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Solid body under the flat top edge */}
      <div className="absolute inset-x-0 bottom-0 top-[2.35rem] bg-background" />

      {/* Top silhouette: flat · bump · flat */}
      <div className="absolute inset-x-0 top-0 flex h-[2.35rem] items-end">
        <div className="relative h-[2px] flex-1 bg-background">
          <div className="absolute inset-x-0 top-0 h-px bg-border" />
        </div>

        <svg
          className="relative -mx-px h-[2.35rem] w-[7rem] shrink-0 text-background"
          viewBox="0 0 112 40"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0 38
               C14 38 24 38 32 26
               C40 14 48 2 56 2
               C64 2 72 14 80 26
               C88 38 98 38 112 38
               V40 H0 Z"
          />
          <path
            fill="none"
            stroke="var(--border)"
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M0 38
               C14 38 24 38 32 26
               C40 14 48 2 56 2
               C64 2 72 14 80 26
               C88 38 98 38 112 38"
          />
        </svg>

        <div className="relative h-[2px] flex-1 bg-background">
          <div className="absolute inset-x-0 top-0 h-px bg-border" />
        </div>
      </div>

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
      <div className="relative mx-auto h-[calc(4.75rem+env(safe-area-inset-bottom,0px))] max-w-lg bg-transparent">
        <NavBarShell />

        <div className="pointer-events-auto relative z-10 grid h-[4.75rem] grid-cols-5 px-0.5 pb-[env(safe-area-inset-bottom,0px)]">
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.isActive(location.pathname);

            if (tab.fab) {
              return (
                <NavLink
                  key={tab.id}
                  to={tab.href}
                  className="relative flex flex-col items-center justify-end pb-1.5"
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "mb-1 flex size-[3.15rem] items-center justify-center rounded-full",
                      "bg-teal-700 text-teal-50 dark:bg-teal-600",
                      "shadow-[0_8px_18px_-4px_rgb(15_118_110_/_0.45)] dark:shadow-[0_8px_18px_-4px_rgb(13_148_136_/_0.35)]",
                      "ring-[3px] ring-background",
                      "transition-transform active:scale-95",
                      active && "bg-teal-600 dark:bg-teal-500",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.25} />
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none",
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
                className="relative mt-[2.35rem] flex flex-col items-center justify-center gap-0.5 pb-1.5"
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
                    className="absolute bottom-0.5 h-0.5 w-5 rounded-full bg-teal-600 dark:bg-teal-400"
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
