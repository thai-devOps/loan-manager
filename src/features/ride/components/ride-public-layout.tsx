import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, Phone, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  hasHotline,
  hasZalo,
  hotlineTelHref,
  getHotlines,
  rideBrand,
} from "@/features/ride/config/ride-brand";
import {
  initRideAnalytics,
  trackRidePageView,
} from "@/features/ride/lib/ride-analytics";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/ride", label: "Trang chủ", end: true },
  { to: "/ride/dich-vu", label: "Dịch vụ" },
  { to: "/ride/locations/an-giang", label: "Khu vực" },
  { to: "/ride/cars", label: "Xe phục vụ" },
  { to: "/ride/pricing", label: "Bảng giá" },
  { to: "/ride/my-booking", label: "Tra cứu" },
  { to: "/ride/contact", label: "Liên hệ" },
] as const;

function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-col gap-1 md:flex-row md:items-center md:gap-1", className)}>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={"end" in item ? item.end : false}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-teal-800 text-teal-50 md:bg-teal-800/10 md:text-teal-900 dark:md:text-teal-200"
                : "text-foreground/80 hover:bg-muted hover:text-foreground",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function RidePublicLayout() {
  const [open, setOpen] = useState(false);
  const tel = hotlineTelHref();
  const hotlines = getHotlines();
  const location = useLocation();

  useEffect(() => {
    initRideAnalytics();
  }, []);

  useEffect(() => {
    trackRidePageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return (
    <div className="ride-site flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link to="/ride" className="min-w-0 shrink">
            <span className="block truncate text-sm font-semibold tracking-tight sm:text-base">
              {rideBrand.name}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {rideBrand.subtitle}
            </span>
          </Link>

          <div className="hidden md:block">
            <NavLinks />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="hidden sm:inline-flex bg-teal-800 hover:bg-teal-700">
              <Link to="/ride/booking">Đặt chuyến</Link>
            </Button>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="Menu">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100%,20rem)]">
                <SheetHeader>
                  <SheetTitle>{rideBrand.shortName}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-4 px-1">
                  <NavLinks onNavigate={() => setOpen(false)} />
                  <Button asChild className="bg-teal-800 hover:bg-teal-700" onClick={() => setOpen(false)}>
                    <Link to="/ride/booking">Đặt chuyến ngay</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-muted/40 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <p className="font-semibold">{rideBrand.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {rideBrand.tagline}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Điều hướng</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link className="hover:text-foreground" to="/ride/dich-vu">
                  Dịch vụ
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" to="/ride/locations/an-giang">
                  Khu vực An Giang
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" to="/ride/routes/an-giang-can-tho">
                  Tuyến An Giang — Cần Thơ
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" to="/ride/xe-co-tai-xe">
                  Giới thiệu {rideBrand.name}
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" to="/ride/cars">
                  Xe phục vụ
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" to="/ride/booking">
                  Đặt chuyến
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" to="/ride/my-booking">
                  Tra cứu chuyến
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Liên hệ</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {hotlines.length > 0 ? (
                hotlines.map((phone) => (
                  <li key={phone.href}>
                    <a className="hover:text-foreground" href={phone.href}>
                      {phone.display}
                    </a>
                  </li>
                ))
              ) : (
                <li>Hotline: đang cập nhật</li>
              )}
              {hasZalo() ? (
                <li>
                  <a
                    className="hover:text-foreground"
                    href={rideBrand.zaloUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chat Zalo
                  </a>
                </li>
              ) : null}
              <li>
                <Link className="hover:text-foreground" to="/ride/contact">
                  Form liên hệ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
          <p>Dịch vụ đưa đón có tài xế — không cung cấp thuê xe tự lái.</p>
          <p className="mt-1.5">
            © {new Date().getFullYear()} Chau Thai. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          {hasHotline() && tel ? (
            <Button variant="outline" size="lg" className="shrink-0 px-3" asChild>
              <a href={tel} aria-label="Gọi hotline">
                <Phone className="size-4" />
              </a>
            </Button>
          ) : null}
          {hasZalo() ? (
            <Button variant="outline" size="lg" className="shrink-0 px-3" asChild>
              <a href={rideBrand.zaloUrl} target="_blank" rel="noreferrer" aria-label="Chat Zalo">
                <MessageCircle className="size-4" />
              </a>
            </Button>
          ) : null}
          <Button asChild size="lg" className="min-h-11 flex-1 bg-teal-800 text-base hover:bg-teal-700">
            <Link to="/ride/booking">Đặt chuyến</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
