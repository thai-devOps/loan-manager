import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { AppLogo } from "@/components/common/app-logo";
import { APP_FEATURES, type AppFeatureId } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const FEATURE_ACCENT: Record<
  AppFeatureId,
  { glow: string; icon: string; ring: string }
> = {
  loans: {
    glow: "from-teal-500/20 via-teal-600/5 to-transparent",
    icon: "bg-teal-700 text-teal-50 group-hover:bg-teal-600",
    ring: "group-hover:border-teal-600/40 group-hover:shadow-teal-900/10 dark:group-hover:shadow-teal-400/10",
  },
  finance: {
    glow: "from-emerald-500/20 via-emerald-600/5 to-transparent",
    icon: "bg-emerald-800 text-emerald-50 group-hover:bg-emerald-700",
    ring: "group-hover:border-emerald-600/40 group-hover:shadow-emerald-900/10 dark:group-hover:shadow-emerald-400/10",
  },
  assets: {
    glow: "from-amber-500/25 via-amber-600/5 to-transparent",
    icon: "bg-amber-800 text-amber-50 group-hover:bg-amber-700",
    ring: "group-hover:border-amber-600/40 group-hover:shadow-amber-900/10 dark:group-hover:shadow-amber-400/10",
  },
  analytics: {
    glow: "from-slate-500/20 via-slate-600/5 to-transparent",
    icon: "bg-slate-800 text-slate-50 group-hover:bg-slate-700 dark:bg-slate-700",
    ring: "group-hover:border-slate-500/40 group-hover:shadow-slate-900/10 dark:group-hover:shadow-slate-400/10",
  },
};

export function AppsHubPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.session?.username);

  function handleLogout() {
    logout();
    void navigate("/login", { replace: true });
  }

  return (
    <div className="apps-hub relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-background pb-32 md:pb-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.45] dark:opacity-[0.2]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(15 118 110 / 0.16) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute -top-32 -right-20 size-112 rounded-full bg-teal-300/35 blur-3xl dark:bg-teal-500/15" />
        <div className="absolute -bottom-40 -left-24 size-120 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute top-1/3 left-1/2 size-72 -translate-x-1/2 rounded-full bg-amber-200/20 blur-3xl dark:bg-amber-400/10" />
      </div>

      <header className="relative z-10 flex w-full min-w-0 items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <AppLogo size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none text-foreground">
              {APP_NAME}
            </p>
            {username && (
              <p className="mt-1.5 truncate text-xs text-muted-foreground">
                Xin chào, {username}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex w-full min-w-0 flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="mb-10 w-full max-w-xl text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="mb-3 text-xs font-medium tracking-[0.22em] text-teal-800/70 uppercase dark:text-teal-300/70">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight">
            Chọn tính năng muốn truy cập
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Mỗi tính năng có menu riêng. Quay lại đây bất cứ lúc nào để đổi
            không gian làm việc.
          </p>
        </div>

        <div className="grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {APP_FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const accent = FEATURE_ACCENT[feature.id];
            return (
              <Link
                key={feature.id}
                to={feature.href}
                style={{ animationDelay: `${80 + index * 70}ms` }}
                className={cn(
                  "group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card/85 p-5 text-left shadow-sm backdrop-blur-sm",
                  "transition-all duration-300 ease-out",
                  "hover:-translate-y-1 hover:shadow-xl",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40",
                  "animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500",
                  accent.ring,
                )}
              >
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                    accent.glow,
                  )}
                />
                <div className="relative min-w-0">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-2xl shadow-sm transition-colors duration-300",
                      accent.icon,
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                    {feature.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 dark:text-teal-300">
                    Vào tính năng
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
