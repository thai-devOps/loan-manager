import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { ServiceIcon } from "@/features/ride/components/service-icon";
import type { RideServiceDef } from "@/features/ride/data/mock-services";
import { cn } from "@/lib/utils";

const ACCENT: Record<
  RideServiceDef["icon"],
  { icon: string; glow: string; chip: string }
> = {
  travel: {
    icon: "bg-emerald-700 text-emerald-50",
    glow: "group-hover:shadow-emerald-900/20 dark:group-hover:shadow-emerald-400/15",
    chip: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
  medical: {
    icon: "bg-sky-700 text-sky-50",
    glow: "group-hover:shadow-sky-900/20 dark:group-hover:shadow-sky-400/15",
    chip: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  },
  pilgrimage: {
    icon: "bg-amber-700 text-amber-50",
    glow: "group-hover:shadow-amber-900/20 dark:group-hover:shadow-amber-400/15",
    chip: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  airport: {
    icon: "bg-indigo-700 text-indigo-50",
    glow: "group-hover:shadow-indigo-900/20 dark:group-hover:shadow-indigo-400/15",
    chip: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  },
  business: {
    icon: "bg-slate-800 text-slate-50",
    glow: "group-hover:shadow-slate-900/25 dark:group-hover:shadow-slate-400/15",
    chip: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  },
  custom: {
    icon: "bg-teal-800 text-teal-50",
    glow: "group-hover:shadow-teal-900/25 dark:group-hover:shadow-teal-400/15",
    chip: "bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  },
};

type Props = {
  service: RideServiceDef;
  className?: string;
  animationDelayMs?: number;
};

export function ServiceCard({
  service,
  className,
  animationDelayMs = 0,
}: Props) {
  const accent = ACCENT[service.icon];
  const style: CSSProperties | undefined =
    animationDelayMs > 0
      ? { animationDelay: `${animationDelayMs}ms` }
      : undefined;

  return (
    <Link
      to={`/ride/booking?serviceType=${service.serviceType}`}
      style={style}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-5 sm:p-6",
        "shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out",
        "hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_18px_36px_-16px_rgb(0_0_0/0.28)]",
        accent.glow,
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full bg-gradient-to-br from-black/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-white/[0.06]"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 ease-out group-hover:scale-105",
            accent.icon,
          )}
        >
          <ServiceIcon icon={service.icon} className="size-5" />
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
            accent.chip,
          )}
        >
          Xe + tài xế
        </span>
      </div>

      <h3 className="relative mt-5 text-lg font-semibold tracking-tight sm:text-xl">
        {service.title}
      </h3>
      <p className="relative mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {service.description}
      </p>

      <div className="relative mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <span className="text-sm font-semibold text-foreground transition-colors duration-300 group-hover:text-teal-800 dark:group-hover:text-teal-300">
          Đặt chuyến
        </span>
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-foreground transition-all duration-300 group-hover:bg-teal-800 group-hover:text-teal-50 group-hover:translate-x-0.5">
          <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </div>

      <span className="sr-only"> — {service.landingHeadline}</span>
    </Link>
  );
}
