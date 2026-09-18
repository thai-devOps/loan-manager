import { cn } from "@/lib/utils";
import { rideBrand } from "@/features/ride/config/ride-brand";

function RouteIllustration({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 360 200"
      fill="none"
      className={cn("text-teal-800/25 dark:text-teal-300/20", className)}
    >
      <path
        d="M40 150 C 90 40, 160 180, 220 90 S 300 40, 330 70"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="6 8"
        strokeLinecap="round"
      />
      <circle cx="40" cy="150" r="10" className="fill-teal-800/80 dark:fill-teal-400/70" />
      <circle cx="40" cy="150" r="4" className="fill-background" />
      <circle cx="330" cy="70" r="10" className="fill-teal-700/90 dark:fill-teal-300/80" />
      <circle cx="330" cy="70" r="4" className="fill-background" />
      <path
        d="M318 52 L330 38 L342 52 Z"
        className="fill-teal-700/70 dark:fill-teal-300/60"
      />
    </svg>
  );
}

export function TrackingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.92_0.03_180),transparent_55%),radial-gradient(ellipse_at_bottom_left,oklch(0.94_0.02_80),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,oklch(0.28_0.04_180),transparent_55%)]"
      />
      <RouteIllustration className="pointer-events-none absolute -right-8 top-6 h-44 w-auto sm:right-8 sm:top-10 sm:h-52 lg:h-56" />

      <div className="relative mx-auto max-w-lg px-4 pt-12 pb-20 sm:px-6 sm:pt-14 sm:pb-24">
        <p className="text-xs font-medium tracking-[0.2em] text-teal-800 uppercase dark:text-teal-300">
          {rideBrand.shortName}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Tra cứu chuyến
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
          Nhập mã chuyến và số điện thoại đã dùng khi đặt để xem trạng thái
          hành trình.
        </p>
      </div>
    </section>
  );
}
