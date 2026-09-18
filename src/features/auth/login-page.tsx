import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginSchema,
  type LoginFormValues,
} from "@/schemas/login.schema";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";

const OUTFIT_HREF =
  "https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&display=swap";

function useOutfitFont() {
  useEffect(() => {
    if (document.querySelector(`link[href="${OUTFIT_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = OUTFIT_HREF;
    document.head.appendChild(link);
  }, []);
}

function resolvePostLoginPath(from?: string): string {
  if (!from || from === "/" || from === "/login" || from === "/apps") {
    return "/apps";
  }
  return from;
}

export function LoginPage() {
  useOutfitFont();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const formErrorId = useId();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={resolvePostLoginPath(from)} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(values.username, values.password);
      if (result.ok === false) {
        setError(result.message);
        return;
      }
      const from = (location.state as { from?: string } | null)?.from;
      void navigate(resolvePostLoginPath(from), { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page grid min-h-full lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src="/login-hero.jpg"
          alt=""
          className="login-hero-image absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-[#071a1f]/55" />
        <div className="absolute inset-0 bg-linear-to-t from-[#041216] via-[#041216]/55 to-transparent" />
        <div
          aria-hidden
          className="login-ambient absolute -top-24 right-[-10%] size-112 rounded-full bg-teal-400/25 blur-3xl"
        />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="login-animate-fade-up">
            <AppLogo
              size="lg"
              className="rounded-2xl ring-1 ring-white/25 shadow-none"
            />
          </div>

          <div className="login-animate-fade-up-delay max-w-lg space-y-5">
            <h1 className="font-(family-name:--font-login-display) text-5xl leading-[1.05] font-semibold tracking-tight text-balance text-white xl:text-6xl">
              {APP_NAME}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/70 xl:text-lg">
              {APP_TAGLINE}
            </p>
          </div>

          <p className="login-animate-fade-up-delay-2 text-xs tracking-wide text-white/45">
            Phiên đăng nhập được bảo vệ · Phân quyền theo vai trò
          </p>
        </div>
      </section>

      <section className="relative flex min-h-full items-center justify-center overflow-hidden bg-background px-5 py-10 sm:px-8">
        <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(15 118 110 / 0.14) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          aria-hidden
          className="login-ambient pointer-events-none absolute -top-28 -right-20 size-80 rounded-full bg-teal-200/35 blur-3xl dark:bg-teal-500/12"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 size-96 rounded-full bg-slate-300/40 blur-3xl dark:bg-slate-500/10"
        />

        <div className="relative w-full max-w-90">
          <div className="login-animate-fade-up mb-9 space-y-4 lg:mb-10">
            <div className="flex items-center gap-3 lg:hidden">
              <AppLogo size="lg" className="rounded-2xl shadow-none" />
              <div>
                <p className="font-(family-name:--font-login-display) text-xl font-semibold tracking-tight text-foreground">
                  {APP_NAME}
                </p>
                <p className="text-xs text-muted-foreground">Workspace</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="font-(family-name:--font-login-display) text-[1.75rem] leading-tight font-semibold tracking-tight text-foreground sm:text-3xl">
                Chào mừng trở lại
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Đăng nhập để mở không gian làm việc của bạn.
              </p>
            </div>
          </div>

          <form
            className="login-animate-fade-up-delay space-y-5"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                inputMode="text"
                spellCheck={false}
                disabled={submitting}
                className="h-11 rounded-xl bg-background/80"
                placeholder="Nhập tên đăng nhập"
                aria-invalid={!!form.formState.errors.username}
                {...form.register("username")}
              />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={submitting}
                  className="h-11 rounded-xl bg-background/80 pr-11"
                  placeholder="Nhập mật khẩu"
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby={error ? formErrorId : undefined}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={submitting}
                  onClick={() => setShowPassword((v) => !v)}
                  className={cn(
                    "absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors",
                    "hover:bg-muted hover:text-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <p
                id={formErrorId}
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-destructive/20 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-xl bg-teal-800 text-teal-50 shadow-none transition-[background-color,transform] hover:bg-teal-700 active:scale-[0.99] dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Đang đăng nhập…
                </span>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>

          <p className="login-animate-fade-up-delay-2 mt-8 text-center text-xs leading-relaxed text-muted-foreground">
            Truy cập theo quyền được cấp · Dữ liệu đồng bộ an toàn
          </p>
        </div>
      </section>
    </div>
  );
}
