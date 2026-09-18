import {
  ArrowDown,
  Calendar,
  CarFront,
  Check,
  MapPin,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BOOKING_STATUS_FLOW,
  BOOKING_STATUS_LABELS,
  TRIP_TYPE_LABELS,
  canShowDriver,
} from "@/features/ride/lib/labels";
import { formatCurrency } from "@/lib/currency";
import type { BookingStatus, TripBooking, Vehicle } from "@/features/ride/types/ride";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/15 text-amber-900 ring-amber-500/30 dark:text-amber-200";
    case "CONFIRMED":
    case "DRIVER_ASSIGNED":
      return "bg-teal-700/15 text-teal-900 ring-teal-700/30 dark:text-teal-200";
    case "DRIVER_ARRIVING":
    case "IN_PROGRESS":
      return "bg-sky-600/15 text-sky-900 ring-sky-600/30 dark:text-sky-200";
    case "COMPLETED":
      return "bg-muted text-muted-foreground ring-border";
    case "CANCELLED":
      return "bg-destructive/10 text-destructive ring-destructive/25";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function statusAccentClass(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "text-amber-800 dark:text-amber-200";
    case "CONFIRMED":
    case "DRIVER_ASSIGNED":
      return "text-teal-800 dark:text-teal-200";
    case "DRIVER_ARRIVING":
    case "IN_PROGRESS":
      return "text-sky-800 dark:text-sky-200";
    case "COMPLETED":
      return "text-foreground";
    case "CANCELLED":
      return "text-destructive";
    default:
      return "text-foreground";
  }
}

function StatusTimeline({
  currentIdx,
}: Readonly<{ currentIdx: number }>) {
  return (
    <ol className="flex flex-col gap-0 md:flex-row md:items-start">
      {BOOKING_STATUS_FLOW.map((status, idx) => {
        const done = currentIdx >= 0 && idx < currentIdx;
        const current = idx === currentIdx;
        const reached = done || current;
        const isLast = idx === BOOKING_STATUS_FLOW.length - 1;
        const connectorDone = currentIdx > idx;

        return (
          <li
            key={status}
            className={cn(
              "relative flex gap-3 md:flex-1 md:flex-col md:items-center md:gap-2.5",
              !isLast && "pb-5 md:pb-0",
            )}
          >
            {!isLast ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-4 left-[15px] h-[calc(100%-0.75rem)] w-px md:hidden",
                  connectorDone ? "bg-teal-700" : "bg-border",
                )}
              />
            ) : null}
            {!isLast ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-4 left-[calc(50%+14px)] hidden h-0.5 w-[calc(100%-28px)] md:block",
                  connectorDone ? "bg-teal-700" : "bg-border",
                )}
              />
            ) : null}

            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-card",
                current &&
                  "border-teal-700 bg-teal-700 text-white shadow-[0_0_0_4px] shadow-teal-700/20",
                done && "border-teal-700 bg-teal-700 text-white",
                !reached && "border-border text-muted-foreground",
              )}
              aria-current={current ? "step" : undefined}
            >
              {done ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <span
                  className={cn(
                    "size-2 rounded-full",
                    current ? "bg-white" : "bg-muted-foreground/40",
                  )}
                />
              )}
            </span>
            <span
              className={cn(
                "pt-1 text-sm leading-snug md:px-1 md:pt-0 md:text-center md:text-xs lg:text-sm",
                current && "font-semibold text-foreground",
                done && "text-foreground",
                !reached && "text-muted-foreground",
              )}
            >
              {BOOKING_STATUS_LABELS[status]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function DriverCard({
  trip,
  vehicle,
  showDriver,
}: Readonly<{
  trip: TripBooking;
  vehicle: Vehicle | null;
  showDriver: boolean;
}>) {
  if (showDriver && trip.driver) {
    return (
      <section className="rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Tài xế của bạn
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-teal-800/10 text-teal-800 dark:bg-teal-300/15 dark:text-teal-200">
              <UserRound className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{trip.driver.name}</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {[vehicle?.name, trip.driver.vehiclePlate].filter(Boolean).join(" · ") ||
                  "Xe riêng + tài xế"}
              </p>
            </div>
          </div>
          {trip.driver.phone ? (
            <Button
              asChild
              className="h-11 w-full gap-2 bg-teal-800 hover:bg-teal-700 sm:w-auto sm:min-w-[10rem]"
            >
              <a href={`tel:${trip.driver.phone.replace(/\D/g, "")}`}>
                <Phone className="size-4" aria-hidden />
                Gọi tài xế
              </a>
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  if (trip.status === "PENDING" || trip.status === "CONFIRMED") {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
        Thông tin tài xế sẽ hiển thị sau khi chuyến được xác nhận và phân tài xế.
      </p>
    );
  }

  return null;
}

export function TrackingResult({
  trip,
  vehicle,
}: Readonly<{ trip: TripBooking; vehicle: Vehicle | null }>) {
  const showDriver = canShowDriver(trip.status) && Boolean(trip.driver);
  const currentFlowIdx =
    trip.status !== "CANCELLED"
      ? BOOKING_STATUS_FLOW.indexOf(trip.status)
      : -1;
  const statusLabel = BOOKING_STATUS_LABELS[trip.status];

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Mã chuyến
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-wide sm:text-2xl">
            #{trip.bookingCode}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset",
            statusBadgeClass(trip.status),
          )}
        >
          <span className="size-2 shrink-0 rounded-full bg-current" aria-hidden />
          {statusLabel}
        </span>
      </header>

      {/*
        Mobile order: status → timeline → route → meta → price → driver
        Desktop: status → route|price → timeline → meta → driver
      */}
      <div className="flex flex-col p-4 sm:p-6 md:p-7">
        <section className="order-1">
          {trip.status === "CANCELLED" ? (
            <p
              className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
              role="status"
            >
              Chuyến đã bị hủy.
            </p>
          ) : (
            <p
              className={cn(
                "flex items-center gap-2.5 text-xl font-semibold tracking-tight sm:text-2xl",
                statusAccentClass(trip.status),
              )}
              role="status"
            >
              <span className="size-2.5 shrink-0 rounded-full bg-current" aria-hidden />
              <span className="uppercase">{statusLabel}</span>
            </p>
          )}
        </section>

        {trip.status !== "CANCELLED" ? (
          <section className="order-2 mt-6 border-y border-border py-5 md:order-3">
            <p className="mb-4 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Tiến trình
            </p>
            <StatusTimeline currentIdx={currentFlowIdx} />
          </section>
        ) : null}

        <section className="order-3 mt-6 md:order-2 md:mt-6">
          <div className="grid gap-6 md:grid-cols-[1.4fr_0.8fr] md:gap-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Lộ trình
              </p>
              <div className="mt-3">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-800/10 text-teal-800 dark:bg-teal-300/15 dark:text-teal-200">
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-wide text-teal-800 uppercase dark:text-teal-300">
                      Điểm đón
                    </p>
                    <p className="mt-0.5 text-base font-medium text-balance">
                      {trip.pickup.address}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 py-1.5 pl-3" aria-hidden>
                  <ArrowDown className="size-4 text-muted-foreground" />
                </div>
                <div className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-600/10 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200">
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-wide text-sky-800 uppercase dark:text-sky-300">
                      Điểm đến
                    </p>
                    <p className="mt-0.5 text-base font-medium text-balance">
                      {trip.destination.address}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price: after meta on mobile (order), beside route on lg */}
            <div className="hidden md:block md:border-l md:border-border md:pl-8">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Giá chuyến
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                {trip.quotedPrice == null
                  ? "Đang xác nhận / Liên hệ báo giá"
                  : formatCurrency(trip.quotedPrice)}
              </p>
            </div>
          </div>
        </section>

        <section className="order-4 mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3 md:order-4">
          <div className="rounded-xl bg-muted/30 px-3.5 py-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Calendar className="size-3.5" aria-hidden />
              Ngày giờ
            </p>
            <p className="mt-1.5 text-sm font-medium">
              {trip.pickupDate} · {trip.pickupTime}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 px-3.5 py-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Users className="size-3.5" aria-hidden />
              Hành khách
            </p>
            <p className="mt-1.5 text-sm font-medium">
              {trip.passengers} khách · {TRIP_TYPE_LABELS[trip.tripType]}
            </p>
          </div>
          <div className="rounded-xl bg-muted/30 px-3.5 py-3 sm:col-span-2 lg:col-span-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <CarFront className="size-3.5" aria-hidden />
              Xe
            </p>
            <p className="mt-1.5 text-sm font-medium">
              {vehicle?.name ?? "Xe"} · Có tài xế
            </p>
          </div>
        </section>

        <section className="order-5 mt-6 border-t border-border pt-5 md:hidden">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Giá chuyến
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {trip.quotedPrice == null
              ? "Đang xác nhận / Liên hệ báo giá"
              : formatCurrency(trip.quotedPrice)}
          </p>
        </section>

        <div className="order-6 mt-6 md:order-6">
          <DriverCard trip={trip} vehicle={vehicle} showDriver={showDriver} />
        </div>
      </div>
    </article>
  );
}
