import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Calendar,
  CarFront,
  Loader2,
  MapPin,
  Phone,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  tripLookupSchema,
  type TripLookupFormValues,
} from "@/features/ride/schemas/trip-booking.schema";
import {
  BOOKING_STATUS_FLOW,
  BOOKING_STATUS_LABELS,
  TRIP_TYPE_LABELS,
  canShowDriver,
} from "@/features/ride/lib/labels";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { tripService } from "@/features/ride/services/tripService";
import { vehicleService } from "@/features/ride/services/vehicleService";
import { formatCurrency } from "@/lib/currency";
import type { BookingStatus, TripBooking, Vehicle } from "@/features/ride/types/ride";
import { cn } from "@/lib/utils";
import {
  hasHotline,
  hotlineTelHref,
  rideBrand,
} from "@/features/ride/config/ride-brand";

function statusBadgeClass(status: BookingStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/15 text-amber-800 ring-amber-500/25 dark:text-amber-200";
    case "CONFIRMED":
    case "DRIVER_ASSIGNED":
      return "bg-teal-700/15 text-teal-900 ring-teal-700/25 dark:text-teal-200";
    case "DRIVER_ARRIVING":
    case "IN_PROGRESS":
      return "bg-sky-600/15 text-sky-900 ring-sky-600/25 dark:text-sky-200";
    case "COMPLETED":
      return "bg-muted text-muted-foreground ring-border";
    case "CANCELLED":
      return "bg-destructive/10 text-destructive ring-destructive/20";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

function timelineDotClass(done: boolean, current: boolean): string {
  if (current) return "bg-teal-700 ring-teal-700/30 ring-4";
  if (done) return "bg-teal-700";
  return "bg-border";
}

function timelineLabelClass(done: boolean, current: boolean): string {
  if (current) return "font-semibold text-foreground";
  if (done) return "text-foreground";
  return "text-muted-foreground";
}

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

function StatusTimeline({
  currentIdx,
}: Readonly<{ currentIdx: number }>) {
  return (
    <ol className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
      {BOOKING_STATUS_FLOW.map((status, idx) => {
        const done = currentIdx >= 0 && idx <= currentIdx;
        const current = idx === currentIdx;
        const isLast = idx === BOOKING_STATUS_FLOW.length - 1;
        const connectorDone = done && idx < currentIdx;

        return (
          <li
            key={status}
            className={cn(
              "relative flex gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2",
              !isLast && "pb-4 sm:pb-0",
            )}
          >
            {!isLast ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-3 left-1.25 h-[calc(100%-0.5rem)] w-px sm:hidden",
                  connectorDone ? "bg-teal-700" : "bg-border",
                )}
              />
            ) : null}
            {!isLast ? (
              <span
                aria-hidden
                className={cn(
                  "absolute top-1.25 left-[calc(50%+8px)] hidden h-px w-[calc(100%-16px)] sm:block",
                  connectorDone ? "bg-teal-700" : "bg-border",
                )}
              />
            ) : null}

            <span
              className={cn(
                "relative z-10 mt-0.5 size-2.5 shrink-0 rounded-full ring-2 ring-background sm:mt-0",
                timelineDotClass(done, current),
              )}
            />
            <span
              className={cn(
                "text-xs leading-snug sm:px-1 sm:text-center",
                timelineLabelClass(done, current),
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

function DriverSection({
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
      <div className="rounded-xl border border-teal-800/15 bg-teal-800/4 p-4 dark:border-teal-300/20 dark:bg-teal-300/6">
        <h2 className="text-sm font-semibold tracking-tight">Tài xế của bạn</h2>
        <p className="mt-2 text-sm font-medium">{trip.driver.name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {vehicle?.name}
          {trip.driver.vehiclePlate ? ` · ${trip.driver.vehiclePlate}` : null}
        </p>
        {trip.driver.phone ? (
          <Button asChild variant="outline" size="sm" className="mt-3">
            <a href={`tel:${trip.driver.phone.replace(/\D/g, "")}`}>
              <Phone className="size-3.5" aria-hidden />
              Gọi tài xế
            </a>
          </Button>
        ) : null}
      </div>
    );
  }

  if (trip.status === "PENDING" || trip.status === "CONFIRMED") {
    return (
      <p className="text-sm text-muted-foreground">
        Thông tin tài xế sẽ hiển thị sau khi chuyến được xác nhận và phân tài xế.
      </p>
    );
  }

  return null;
}

function JourneyResult({
  trip,
  vehicle,
}: Readonly<{ trip: TripBooking; vehicle: Vehicle | null }>) {
  const showDriver = canShowDriver(trip.status) && Boolean(trip.driver);
  const currentFlowIdx =
    trip.status !== "CANCELLED"
      ? BOOKING_STATUS_FLOW.indexOf(trip.status)
      : -1;

  return (
    <article
      className={cn(
        "mt-8 mb-12 space-y-6 rounded-2xl border border-border bg-card p-4 sm:p-6",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Mã chuyến
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-wide">
            #{trip.bookingCode}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
            statusBadgeClass(trip.status),
          )}
        >
          {BOOKING_STATUS_LABELS[trip.status]}
        </span>
      </div>

      {trip.status === "CANCELLED" ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Chuyến đã bị hủy.
        </p>
      ) : (
        <StatusTimeline currentIdx={currentFlowIdx} />
      )}

      <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex gap-3">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-teal-700"
            aria-hidden
          />
          <div className="min-w-0 space-y-2 text-sm">
            <p className="font-medium text-balance">{trip.pickup.address}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowRight className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">đến</span>
            </div>
            <p className="font-medium text-balance">
              {trip.destination.address}
            </p>
          </div>
        </div>

        <div className="grid gap-2 border-t border-border/80 pt-3 text-sm text-muted-foreground sm:grid-cols-2">
          <p className="inline-flex items-center gap-2">
            <Calendar className="size-3.5 shrink-0" aria-hidden />
            {trip.pickupDate} · {trip.pickupTime}
          </p>
          <p className="inline-flex items-center gap-2">
            <Users className="size-3.5 shrink-0" aria-hidden />
            {trip.passengers} khách · {TRIP_TYPE_LABELS[trip.tripType]}
          </p>
          <p className="inline-flex items-center gap-2 sm:col-span-2">
            <CarFront className="size-3.5 shrink-0" aria-hidden />
            {vehicle?.name ?? "Xe"} · Có tài xế
          </p>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">Giá chuyến</span>
        <span className="text-right text-base font-semibold tracking-tight">
          {trip.quotedPrice == null
            ? "Đang xác nhận / Liên hệ báo giá"
            : formatCurrency(trip.quotedPrice)}
        </span>
      </div>

      <DriverSection trip={trip} vehicle={vehicle} showDriver={showDriver} />
    </article>
  );
}

export function RideMyBookingPage() {
  useRidePageMeta(
    "Tra cứu chuyến",
    "Tra cứu yêu cầu đặt chuyến bằng mã chuyến và số điện thoại.",
  );

  const [searchParams] = useSearchParams();
  const [trip, setTrip] = useState<TripBooking | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const form = useForm<TripLookupFormValues>({
    resolver: zodResolver(tripLookupSchema),
    defaultValues: {
      bookingCode: searchParams.get("code") ?? "",
      phone: "",
    },
  });

  async function onSubmit(values: TripLookupFormValues) {
    setLoading(true);
    setNotFound(false);
    setTrip(null);
    setVehicle(null);
    setHasSearched(true);
    try {
      const found = await tripService.lookupTrip({
        bookingCode: values.bookingCode,
        phone: values.phone,
      });
      if (!found) {
        setNotFound(true);
        return;
      }
      setTrip(found);
      const v = await vehicleService.getVehicleById(found.vehicleId);
      setVehicle(v);
    } finally {
      setLoading(false);
    }
  }

  const tel = hotlineTelHref();

  return (
    <div>
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

      <div className="relative mx-auto max-w-lg px-4 sm:px-6">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            "-mt-12 space-y-4 rounded-2xl border border-border bg-card/90 p-4 shadow-lg shadow-teal-950/5 backdrop-blur-sm sm:p-6",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500",
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-teal-900 dark:text-teal-200">
            <Search className="size-4 shrink-0" aria-hidden />
            Thông tin tra cứu
          </div>

          <div className="space-y-2">
            <Label htmlFor="bookingCode">Mã chuyến</Label>
            <Input
              id="bookingCode"
              placeholder="TRIP1025"
              autoComplete="off"
              className="font-mono tracking-wide"
              {...form.register("bookingCode")}
            />
            {form.formState.errors.bookingCode ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.bookingCode.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="09xxxxxxxx"
              autoComplete="tel"
              {...form.register("phone")}
            />
            {form.formState.errors.phone ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.phone.message}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-800 transition-colors hover:bg-teal-700"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Đang tra cứu…
              </>
            ) : (
              <>
                <Search className="size-4" aria-hidden />
                Tra cứu
              </>
            )}
          </Button>
        </form>

        {!hasSearched && !trip ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Mã chuyến được gửi sau khi bạn đặt thành công (SMS hoặc trang xác
            nhận).
          </p>
        ) : null}

        {notFound ? (
          <div
            className={cn(
              "mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground sm:p-5",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-400",
            )}
          >
            <p>
              Không tìm thấy chuyến khớp mã và số điện thoại. Kiểm tra lại hoặc
              liên hệ hỗ trợ.
            </p>
            {hasHotline() && tel ? (
              <a
                className="mt-3 inline-flex items-center gap-1.5 font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                href={tel}
              >
                <Phone className="size-3.5" aria-hidden />
                Gọi hotline
              </a>
            ) : null}
          </div>
        ) : null}

        {trip ? <JourneyResult trip={trip} vehicle={vehicle} /> : null}
      </div>
    </div>
  );
}
