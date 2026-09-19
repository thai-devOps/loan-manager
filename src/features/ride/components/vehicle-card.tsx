import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check, Users } from "lucide-react";
import { rideBrand } from "@/features/ride/config/ride-brand";
import type { Vehicle } from "@/features/ride/types/ride";
import { SUITABLE_FOR_LABELS } from "@/features/ride/lib/labels";
import { getCloudinaryImageUrl } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

type Props = {
  vehicle: Vehicle;
  className?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onSelect?: () => void;
  selected?: boolean;
  /** Stagger entrance animation delay in ms */
  animationDelayMs?: number;
};

export function VehicleCard({
  vehicle,
  className,
  ctaLabel = "Xem xe",
  ctaTo,
  onSelect,
  selected,
  animationDelayMs = 0,
}: Props) {
  const image = vehicle.images[0];
  const suitable = vehicle.suitableFor.slice(0, 3);
  const href = ctaTo ?? `/ride/cars/${vehicle.id}`;

  const body = (
    <>
      <div className="relative overflow-hidden bg-linear-to-b from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
        <div className="aspect-4/3 p-4 sm:p-5">
          {image ? (
            <img
              src={getCloudinaryImageUrl(image, { width: 640 })}
              alt={vehicle.name}
              className="size-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : null}
        </div>
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
          <Users className="size-3 opacity-70" aria-hidden />
          {vehicle.seats} chỗ
        </span>
        {selected ? (
          <span className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-full bg-teal-700 text-white shadow-sm">
            <Check className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {vehicle.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {rideBrand.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {suitable.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {SUITABLE_FOR_LABELS[tag]}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-1">
          {onSelect ? (
            <span
              className={cn(
                "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors duration-300",
                selected
                  ? "bg-teal-800 text-teal-50"
                  : "bg-foreground text-background group-hover:bg-teal-800 group-hover:text-teal-50",
              )}
            >
              {selected ? "Đã chọn" : "Chọn xe"}
            </span>
          ) : (
            <span className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-foreground text-sm font-semibold text-background transition-colors duration-300 group-hover:bg-teal-800 group-hover:text-teal-50">
              {ctaLabel}
              <ArrowUpRight
                className="size-4 opacity-70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </span>
          )}
        </div>
      </div>
    </>
  );

  const shellClass = cn(
    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card",
    "shadow-[0_1px_2px_rgb(0_0_0/0.04)]",
    "transition-[transform,box-shadow,border-color] duration-300 ease-out",
    "hover:-translate-y-1 hover:border-teal-800/25 hover:shadow-[0_12px_28px_-12px_rgb(15_118_110/0.35)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40",
    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500",
    selected && "border-teal-700 ring-2 ring-teal-700/30",
    className,
  );

  const style: CSSProperties | undefined =
    animationDelayMs > 0
      ? { animationDelay: `${animationDelayMs}ms` }
      : undefined;

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(shellClass, "w-full cursor-pointer text-left")}
        style={style}
        aria-pressed={selected}
      >
        {body}
      </button>
    );
  }

  return (
    <Link to={href} className={shellClass} style={style}>
      {body}
    </Link>
  );
}
