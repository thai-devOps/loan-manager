import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LogOut } from "lucide-react";
import { APP_FEATURES } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

export function AppsHubPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const username = useAuthStore((s) => s.session?.username);

  function handleLogout() {
    logout();
    void navigate("/login", { replace: true });
  }

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 12%, transparent) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute -top-28 right-[-6rem] size-80 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-[-4rem] size-96 rounded-full bg-info/10 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            LM
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Loan Manager</p>
            {username && (
              <p className="mt-1 text-xs text-muted-foreground">
                Xin chào, {username}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="size-4" />
          Đăng xuất
        </Button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="mb-10 max-w-lg text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Chọn tính năng muốn truy cập
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Mỗi tính năng có menu riêng. Bạn có thể quay lại đây bất cứ lúc nào
            để đổi sang tính năng khác.
          </p>
        </div>

        <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {APP_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.id}
                to={feature.href}
                className={cn(
                  "group flex flex-col rounded-2xl border bg-card p-5 text-left shadow-sm transition-all",
                  "hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-5 text-lg font-semibold tracking-tight">
                  {feature.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                  Vào tính năng
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
