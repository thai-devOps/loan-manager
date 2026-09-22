import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Search,
  Target,
  UserRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import {
  APP_FEATURES,
  canAccessFeature,
  type AppFeature,
} from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  featureDisplayDescription,
  featureDisplayTitle,
  filterFeaturesByQuery,
  HUB_ACCENT,
  initialsFromName,
} from "@/features/apps/hub-meta";
import { useHubBadges } from "@/features/apps/use-hub-badges";
import { APP_BRAND_LOGO_SRC, APP_NAME } from "@/lib/brand";
import { prefetchFeatureRoute } from "@/lib/prefetch-feature";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

function AppFeatureCard({
  feature,
  badge,
  className,
}: {
  feature: AppFeature;
  badge: string;
  className?: string;
}) {
  const Icon = feature.icon;
  const accent = HUB_ACCENT[feature.id];
  const title = featureDisplayTitle(feature.id, feature.title);
  const description = featureDisplayDescription(
    feature.id,
    feature.description,
  );

  return (
    <Link
      to={feature.href}
      onPointerDown={() => prefetchFeatureRoute(feature.href)}
      className={cn(
        "group relative flex min-w-0 items-center gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-sm",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/35",
        accent.ring,
        className,
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105",
          accent.icon,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">
          {description}
        </p>
        <span
          className={cn(
            "mt-2.5 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium",
            accent.badge,
          )}
        >
          {badge}
        </span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

export function AppsHubPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.session?.username);
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const hasModuleAccess = useAuthStore((s) => s.hasModuleAccess);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);

  const [query, setQuery] = useState("");

  const displayName =
    user?.name?.trim() || username || "bạn";

  const roleLabel = (() => {
    if (roles[0]) return roles[0].replaceAll("_", " ");
    if (hasAnyPermission(["user.view", "role.view"])) return "Admin";
    return "Thành viên";
  })();

  const visibleFeatures = useMemo(
    () =>
      APP_FEATURES.filter((feature) =>
        canAccessFeature(feature, { hasModuleAccess, hasAnyPermission }),
      ),
    [hasModuleAccess, hasAnyPermission],
  );

  const filtered = useMemo(
    () => filterFeaturesByQuery(visibleFeatures, query),
    [visibleFeatures, query],
  );

  const gridFeatures = filtered.filter((f) => f.id !== "accessAdmin");
  const adminFeature = filtered.find((f) => f.id === "accessAdmin");
  const showGoals =
    !query.trim() &&
    (hasModuleAccess("gold") || hasModuleAccess("asset"));

  const badges = useHubBadges({
    loans: visibleFeatures.some((f) => f.id === "loans"),
    finance: visibleFeatures.some((f) => f.id === "finance"),
    assets: visibleFeatures.some((f) => f.id === "assets"),
  });

  function handleLogout() {
    logout();
    void navigate("/login", { replace: true });
  }

  return (
    <div className="apps-hub relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#f5f8fc] pb-28 dark:bg-background md:pb-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/80 via-transparent to-transparent dark:from-sky-950/40" />
        <div className="absolute -top-20 right-[-8%] hidden h-72 w-72 rounded-full bg-sky-200/40 blur-3xl md:block dark:bg-sky-500/10" />
        <div className="absolute bottom-[-10%] left-[-6%] hidden h-80 w-80 rounded-full bg-emerald-100/50 blur-3xl md:block dark:bg-emerald-500/10" />
      </div>

      <header className="relative z-10 flex w-full min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-5">
        <div className="relative w-full min-w-0 sm:max-w-md lg:max-w-lg">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm ứng dụng... (VD: vay, chi tiêu, vàng)"
            aria-label="Tìm kiếm ứng dụng"
            className="h-10 rounded-xl border-border/70 bg-card/90 pl-9 shadow-sm backdrop-blur-sm"
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <ThemeToggle className="rounded-xl" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 gap-2 rounded-xl border-border/70 bg-card/90 px-2.5 shadow-sm backdrop-blur-sm"
              >
                <span className="relative flex size-7 shrink-0 overflow-hidden rounded-full bg-sky-600 text-[11px] font-semibold text-white">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      {initialsFromName(displayName)}
                    </span>
                  )}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span className="block max-w-32 truncate text-sm font-medium leading-tight">
                    {displayName}
                  </span>
                  <span className="block text-[11px] leading-tight text-muted-foreground capitalize">
                    {roleLabel}
                  </span>
                </span>
                <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{APP_NAME}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserRound className="size-4" />
                  Tài khoản
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-8 px-4 pb-10 sm:px-8 sm:pb-14">
        <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white/90 via-sky-50/80 to-sky-100/60 p-6 shadow-sm motion-safe:duration-500 dark:border-border dark:from-card dark:via-card dark:to-sky-950/30 sm:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Xin chào, {displayName}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Quản lý tài chính cá nhân, tài sản và các khoản vay của bạn một
                cách dễ dàng và hiệu quả.
              </p>
            </div>
            <div className="relative mx-auto flex w-full max-w-sm items-center justify-center lg:mx-0 lg:justify-end">
              <div
                aria-hidden
                className="absolute inset-6 rounded-full bg-sky-200/50 blur-2xl dark:bg-sky-500/20"
              />
              <img
                src={APP_BRAND_LOGO_SRC}
                alt=""
                className="relative z-1 size-36 object-contain drop-shadow-md sm:size-44"
              />
              <p className="absolute right-0 bottom-2 z-1 hidden max-w-44 -rotate-6 text-right font-serif text-sm leading-snug text-sky-900/70 italic sm:block dark:text-sky-200/70">
                Tài chính vững vàng — Tương lai an tâm
              </p>
            </div>
          </div>
        </section>

        <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500 motion-safe:delay-100">
          <div className="mb-4 flex items-start gap-3">
            <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
              <LayoutGrid className="size-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Ứng dụng của bạn
              </h2>
              <p className="text-sm text-muted-foreground">
                Chọn ứng dụng để bắt đầu quản lý và theo dõi.
              </p>
            </div>
          </div>

          {gridFeatures.length === 0 && !adminFeature ? (
            <p className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy ứng dụng phù hợp với “{query.trim()}”.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
              {gridFeatures.map((feature, i) => (
                <div
                  key={feature.id}
                  className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500"
                  style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                >
                  <AppFeatureCard
                    feature={feature}
                    badge={badges[feature.id]}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {(adminFeature || showGoals) && (
          <section
            className={cn(
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500 motion-safe:delay-150 grid gap-3",
              adminFeature && showGoals
                ? "lg:grid-cols-[1.6fr_1fr]"
                : "grid-cols-1",
            )}
          >
            {adminFeature && (
              <AppFeatureCard
                feature={adminFeature}
                badge={badges.accessAdmin}
                className="min-h-22 sm:p-5"
              />
            )}
            {showGoals && (
              <Link
                to="/assets/gold-plan"
                onPointerDown={() => prefetchFeatureRoute("/assets/gold-plan")}
                className={cn(
                  "group relative flex min-w-0 items-center gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-sm sm:p-5",
                  "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
                  "hover:border-teal-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35",
                  "dark:hover:border-teal-700/50",
                )}
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 transition-transform duration-200 group-hover:scale-105 dark:bg-teal-900/50 dark:text-teal-300">
                  <Target className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Mục tiêu tài chính
                  </h2>
                  <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
                    Cùng bạn xây dựng kế hoạch, hiện thực hóa ước mơ!
                  </p>
                </div>
                <div
                  aria-hidden
                  className="hidden h-10 w-16 items-end gap-0.5 opacity-60 sm:flex"
                >
                  <span className="h-3 w-2 rounded-sm bg-teal-300/80 dark:bg-teal-600/60" />
                  <span className="h-5 w-2 rounded-sm bg-teal-400/80 dark:bg-teal-500/60" />
                  <span className="h-7 w-2 rounded-sm bg-teal-500/80 dark:bg-teal-400/60" />
                  <span className="h-4 w-2 rounded-sm bg-teal-300/80 dark:bg-teal-600/60" />
                  <span className="h-9 w-2 rounded-sm bg-teal-600/80 dark:bg-teal-300/60" />
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
