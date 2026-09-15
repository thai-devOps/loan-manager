import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginSchema,
  type LoginFormValues,
} from "@/schemas/login.schema";
import { useAuthStore } from "@/stores/auth.store";

function resolvePostLoginPath(from?: string): string {
  if (!from || from === "/" || from === "/login" || from === "/apps") {
    return "/apps";
  }
  return from;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      if (!result.ok) {
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
    <div className="login-page grid min-h-full lg:grid-cols-2">
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src="/login-hero.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b3d3a]/92 via-[#0b3d3a]/45 to-[#0b3d3a]/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(45_166_154_/_0.35),transparent_55%)]" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <p className="font-[family-name:var(--font-login-display)] text-sm tracking-[0.2em] text-teal-50/80 uppercase">
            Loan Manager
          </p>

          <div className="max-w-md space-y-4">
            <h1 className="font-[family-name:var(--font-login-display)] text-4xl leading-tight font-semibold text-balance text-teal-50 xl:text-5xl">
              Quản lý cho vay rõ ràng, mỗi kỳ thu đúng hạn
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-teal-50/75">
              Theo dõi người vay, dư nợ và lịch thu trong một không gian gọn
              nhẹ dành cho quản trị viên.
            </p>
          </div>

          <p className="text-xs tracking-wide text-teal-50/55">
            Bảo mật phiên đăng nhập · Chỉ dành cho admin
          </p>
        </div>
      </section>

      <section className="relative flex min-h-full items-center justify-center overflow-hidden bg-background px-5 py-10 sm:px-8">
        <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
          <ThemeToggle />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(15 118 110 / 0.18) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="pointer-events-none absolute -top-24 right-[-4rem] size-72 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-500/15" />
        <div className="pointer-events-none absolute bottom-[-5rem] left-[-3rem] size-80 rounded-full bg-emerald-100/70 blur-3xl dark:bg-emerald-500/10" />

        <div className="relative w-full max-w-[24rem]">
          <div className="mb-8 space-y-3 lg:mb-10">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex size-11 items-center justify-center rounded-xl bg-teal-700 font-[family-name:var(--font-login-display)] text-sm font-semibold tracking-wide text-teal-50 dark:bg-teal-600">
                LM
              </div>
              <p className="font-[family-name:var(--font-login-display)] text-lg font-semibold text-foreground">
                Loan Manager
              </p>
            </div>

            <h2 className="font-[family-name:var(--font-login-display)] text-3xl font-semibold tracking-tight text-foreground">
              Đăng nhập
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nhập tài khoản quản trị để tiếp tục làm việc.
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                className="h-11"
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
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="h-11"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full gap-2 bg-teal-700 text-teal-50 shadow-none hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              {submitting ? (
                "Đang đăng nhập..."
              ) : (
                <>
                  <LockKeyhole className="size-4" />
                  Đăng nhập
                  <ArrowRight className="size-4 opacity-80" />
                </>
              )}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
