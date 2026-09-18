import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Calendar,
  CarFront,
  Check,
  MapPin,
  Phone,
  Route,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingStatusBadge } from "@/features/ride-admin/components/booking-status-badge";
import { Can } from "@/features/auth/can";
import {
  availabilityAdminService,
  bookingAdminService,
  driverAdminService,
  tripAdminService,
  vehicleAdminService,
  type AvailabilityOption,
} from "@/features/ride-admin/services/admin-api";
import {
  SERVICE_TYPE_LABELS,
  TRIP_TYPE_LABELS,
} from "@/features/ride/lib/labels";
import {
  formatRideDateTime,
  formatRideTimestamp,
} from "@/features/ride-admin/lib/format";
import type {
  BookingPricingSnapshot,
  BookingQuoteSnapshot,
  BookingStatus,
  Driver,
  PriceQuote,
  TripBooking,
  Vehicle,
} from "@/features/ride/types/ride";
import { pricingService } from "@/features/ride/services/pricingService";
import { MoneyInput } from "@/features/finance/components/money-input";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { PERMISSIONS } from "@/config/permissions";
import { cn } from "@/lib/utils";

function formatDurationMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

type StatusAction = {
  label: string;
  run: () => void;
  variant?: "default" | "destructive" | "outline";
  primary?: boolean;
  icon?: "check" | "delete";
};

export function RideAdminBookingDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<TripBooking | null | undefined>(
    undefined,
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [availVehicles, setAvailVehicles] = useState<AvailabilityOption[]>([]);
  const [availDrivers, setAvailDrivers] = useState<AvailabilityOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [paid, setPaid] = useState(0);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [calcBusy, setCalcBusy] = useState(false);
  const [draftQuote, setDraftQuote] = useState<PriceQuote | null>(null);
  const [draftSnapshot, setDraftSnapshot] = useState<BookingQuoteSnapshot | null>(
    null,
  );
  const [draftPricingSnapshot, setDraftPricingSnapshot] =
    useState<BookingPricingSnapshot | null>(null);

  async function load() {
    setError(null);
    try {
      const [b, v, d] = await Promise.all([
        bookingAdminService.get(id),
        vehicleAdminService.list(),
        driverAdminService.list(),
      ]);
      setBooking(b);
      setVehicles(v);
      setDrivers(d);
      setQuote(b.quotedPrice ?? 0);
      setDeposit(b.deposit ?? 0);
      setPaid(b.paidAmount ?? 0);
      setVehicleId(b.vehicleId || "");
      setDriverId(b.driverId || "");
      try {
        const avail = await availabilityAdminService.get({ bookingId: b.id });
        setAvailVehicles(avail.vehicles);
        setAvailDrivers(avail.drivers);
      } catch {
        setAvailVehicles([]);
        setAvailDrivers([]);
      }
    } catch (e) {
      setBooking(null);
      setError(e instanceof ApiError ? e.message : "Không tải booking");
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await bookingAdminService.action(id, body);
      setBooking(updated);
      setQuote(updated.quotedPrice ?? 0);
      setDeposit(updated.deposit ?? 0);
      setPaid(updated.paidAmount ?? 0);
      setVehicleId(updated.vehicleId || "");
      setDriverId(updated.driverId || "");
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Thao tác thất bại");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createTripFromBooking() {
    setCreatingTrip(true);
    setError(null);
    try {
      const trip = await tripAdminService.create({ bookingId: id });
      const refreshed = await bookingAdminService.get(id);
      setBooking(refreshed);
      return trip.id;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tạo được chuyến");
      return null;
    } finally {
      setCreatingTrip(false);
    }
  }

  async function calculateAutoQuote() {
    if (!booking) return;
    setCalcBusy(true);
    setError(null);
    try {
      const pickup = {
        address: booking.pickup?.address ?? "",
        latitude:
          booking.pickup?.latitude == null
            ? null
            : Number(booking.pickup.latitude),
        longitude:
          booking.pickup?.longitude == null
            ? null
            : Number(booking.pickup.longitude),
      };
      const destination = {
        address: booking.destination?.address ?? "",
        latitude:
          booking.destination?.latitude == null
            ? null
            : Number(booking.destination.latitude),
        longitude:
          booking.destination?.longitude == null
            ? null
            : Number(booking.destination.longitude),
      };
      if (
        !Number.isFinite(pickup.latitude as number) ||
        !Number.isFinite(pickup.longitude as number) ||
        (pickup.latitude === 0 && pickup.longitude === 0)
      ) {
        pickup.latitude = null;
        pickup.longitude = null;
      }
      if (
        !Number.isFinite(destination.latitude as number) ||
        !Number.isFinite(destination.longitude as number) ||
        (destination.latitude === 0 && destination.longitude === 0)
      ) {
        destination.latitude = null;
        destination.longitude = null;
      }

      const result = await pricingService.getQuote({
        tripType: booking.tripType,
        vehicleId: vehicleId || booking.vehicleId,
        pickup,
        destination,
        serviceType: booking.serviceType,
        date: booking.pickupDate,
      });
      setDraftQuote(result);
      if (result.snapshot && result.amount != null) {
        setDraftSnapshot(result.snapshot);
        setQuote(result.amount);
      } else {
        setDraftSnapshot(null);
      }
      setDraftPricingSnapshot(result.pricingSnapshot ?? null);
      if (result.errorMessage && !result.autoQuote) {
        setError(result.errorMessage);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tính được báo giá");
    } finally {
      setCalcBusy(false);
    }
  }

  if (booking === undefined) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (!booking) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{error ?? "Không tìm thấy"}</p>
        <Button asChild variant="outline">
          <Link to="/admin/bookings">Quay lại</Link>
        </Button>
      </div>
    );
  }

  const remaining = (booking.quotedPrice ?? 0) - (booking.paidAmount ?? 0);
  const vehicle = vehicles.find((v) => v.id === booking.vehicleId);
  const driverName =
    booking.driver?.name ??
    drivers.find((d) => d.id === booking.driverId)?.name ??
    null;
  const snapshot = draftQuote ?? booking.quoteSnapshot;

  const statusActions: StatusAction[] = [];
  if (booking.status === "PENDING") {
    statusActions.push({
      label: "Xác nhận",
      primary: true,
      icon: "check",
      run: () => void run({ action: "confirm" }),
    });
    statusActions.push({
      label: "Từ chối",
      variant: "destructive",
      icon: "delete",
      run: () => void run({ action: "cancel" }),
    });
  } else {
    if (booking.status === "DRIVER_ASSIGNED") {
      statusActions.push({
        label: "Tài xế đang đến",
        run: () =>
          void run({
            action: "setStatus",
            status: "DRIVER_ARRIVING" as BookingStatus,
          }),
      });
      statusActions.push({
        label: "Bắt đầu chuyến",
        primary: true,
        icon: "check",
        run: () =>
          void run({
            action: "setStatus",
            status: "IN_PROGRESS" as BookingStatus,
          }),
      });
    }
    if (booking.status === "DRIVER_ARRIVING") {
      statusActions.push({
        label: "Bắt đầu chuyến",
        primary: true,
        icon: "check",
        run: () =>
          void run({
            action: "setStatus",
            status: "IN_PROGRESS" as BookingStatus,
          }),
      });
    }
    if (booking.status === "IN_PROGRESS") {
      statusActions.push({
        label: "Hoàn thành",
        primary: true,
        icon: "check",
        run: () =>
          void run({
            action: "setStatus",
            status: "COMPLETED" as BookingStatus,
          }),
      });
    }
    if (booking.status !== "CANCELLED" && booking.status !== "COMPLETED") {
      statusActions.push({
        label: "Hủy",
        variant: "outline",
        icon: "delete",
        run: () => void run({ action: "cancel" }),
      });
    }
  }
  const canAssign =
    booking.status === "CONFIRMED" || booking.status === "DRIVER_ASSIGNED";

  return (
    <div className="space-y-4">
      {/* Header + actions */}
      <section className="overflow-hidden rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50 via-emerald-50/70 to-sky-50 dark:border-teal-900 dark:from-teal-950/50 dark:via-emerald-950/30 dark:to-sky-950/20">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2 text-teal-800 hover:bg-teal-100/70 hover:text-teal-900 dark:text-teal-200 dark:hover:bg-teal-900/40"
            >
              <Link to="/admin/bookings">
                <ArrowLeft className="size-4" />
                Booking
              </Link>
            </Button>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-semibold tracking-tight text-teal-950 dark:text-teal-50 sm:text-2xl">
                #{booking.bookingCode}
              </h1>
              <BookingStatusBadge status={booking.status} />
              <span className="text-xs font-medium text-teal-800/70 dark:text-teal-200/70">
                {SERVICE_TYPE_LABELS[booking.serviceType]}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {booking.tripId ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-teal-200 bg-white/70 dark:border-teal-800 dark:bg-teal-950/40"
              >
                <Link to={`/admin/trips/${booking.tripId}`}>
                  <Route className="size-3.5" />
                  Chuyến
                </Link>
              </Button>
            ) : booking.status !== "PENDING" &&
              booking.status !== "CANCELLED" ? (
              <Can permission={PERMISSIONS.FLEET_TRIP_CREATE}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-teal-200 bg-white/70 dark:border-teal-800 dark:bg-teal-950/40"
                  disabled={busy || creatingTrip}
                  onClick={() => {
                    void (async () => {
                      const tripId = await createTripFromBooking();
                      if (tripId) void navigate(`/admin/trips/${tripId}`);
                    })();
                  }}
                >
                  {creatingTrip ? "Đang tạo…" : "Tạo chuyến"}
                </Button>
              </Can>
            ) : null}
            {statusActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                disabled={busy}
                variant={
                  action.variant ?? (action.primary ? "default" : "outline")
                }
                className={cn(
                  action.primary &&
                    !action.variant &&
                    "bg-teal-800 hover:bg-teal-700",
                  action.icon === "delete" &&
                    action.variant === "outline" &&
                    "border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive",
                )}
                onClick={action.run}
              >
                {action.icon === "check" ? (
                  <Check className="size-4" />
                ) : action.icon === "delete" ? (
                  <Trash2 className="size-4" />
                ) : null}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Journey — primary column */}
        <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-7 xl:col-span-8">
          <div className="flex items-center gap-2 border-b border-teal-100 bg-teal-50/80 px-4 py-2.5 dark:border-teal-900/60 dark:bg-teal-950/40">
            <span className="flex size-7 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
              <MapPin className="size-3.5" />
            </span>
            <h2 className="text-sm font-semibold text-teal-900 dark:text-teal-100">
              Hành trình
            </h2>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200/80 dark:bg-teal-900/50 dark:text-teal-100 dark:ring-teal-800">
              <Users className="size-3" />
              {TRIP_TYPE_LABELS[booking.tripType]} · {booking.passengers} khách
            </span>
          </div>

          <div className="grid flex-1 gap-4 p-4 sm:grid-cols-[1.4fr_1fr] sm:gap-6">
            <div className="relative space-y-4 pl-1">
              <div className="absolute top-2 bottom-2 left-[7px] w-px bg-gradient-to-b from-teal-600 to-sky-500" />
              <p className="relative flex gap-3 text-sm">
                <span className="mt-1 size-3.5 shrink-0 rounded-full border-2 border-white bg-teal-700 shadow ring-1 ring-teal-600" />
                <span className="min-w-0">
                  <span className="mb-0.5 block text-[11px] font-semibold tracking-wide text-teal-700 uppercase">
                    Điểm đón
                  </span>
                  <span className="text-balance font-medium">
                    {booking.pickup.address}
                  </span>
                </span>
              </p>
              <p className="relative flex gap-3 text-sm">
                <span className="mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow ring-1 ring-sky-400">
                  <ArrowRight className="size-2.5" />
                </span>
                <span className="min-w-0">
                  <span className="mb-0.5 block text-[11px] font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-300">
                    Điểm đến
                  </span>
                  <span className="text-balance font-medium">
                    {booking.destination.address}
                  </span>
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:border-l sm:border-teal-100 sm:pl-5 dark:sm:border-teal-900/50">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-900">
                <Calendar className="size-3.5 shrink-0" />
                Đón {formatRideDateTime(booking.pickupDate, booking.pickupTime)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-2 text-xs font-medium text-muted-foreground ring-1 ring-border">
                Đặt lúc {formatRideTimestamp(booking.createdAt)}
              </span>
              {booking.note ? (
                <span className="rounded-lg bg-orange-50 px-2.5 py-2 text-xs font-medium leading-relaxed text-orange-900 ring-1 ring-orange-200/80 dark:bg-orange-950/40 dark:text-orange-100 dark:ring-orange-900">
                  {booking.note}
                </span>
              ) : (
                <span className="rounded-lg bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
                  Không có ghi chú
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Side stack */}
        <aside className="flex h-full flex-col gap-4 lg:col-span-5 xl:col-span-4">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-sky-100 bg-sky-50/80 px-4 py-2.5 dark:border-sky-900/60 dark:bg-sky-950/40">
              <span className="flex size-7 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
                <UserRound className="size-3.5" />
              </span>
              <h2 className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                Khách hàng
              </h2>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {booking.customerId ? (
                    <Link
                      className="text-sky-900 underline-offset-2 hover:underline dark:text-sky-100"
                      to={`/admin/customers/${booking.customerId}`}
                    >
                      {booking.customer.name}
                    </Link>
                  ) : (
                    booking.customer.name
                  )}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {booking.customer.phone}
                </p>
              </div>
              <Button
                asChild
                size="sm"
                className="shrink-0 bg-sky-700 hover:bg-sky-600"
              >
                <a href={`tel:${booking.customer.phone.replace(/\D/g, "")}`}>
                  <Phone className="size-3.5" />
                  Gọi
                </a>
              </Button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50/80 px-4 py-2.5 dark:border-indigo-900/60 dark:bg-indigo-950/40">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <CarFront className="size-3.5" />
              </span>
              <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                Xe & tài xế
              </h2>
            </div>
            <dl className="grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <dt className="text-xs text-muted-foreground">Xe</dt>
                <dd className="font-medium text-indigo-950 dark:text-indigo-50">
                  {vehicle?.name ?? booking.vehicleId}
                  {vehicle ? ` · ${vehicle.seats} chỗ` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tài xế</dt>
                <dd
                  className={cn(
                    "font-medium",
                    driverName
                      ? "text-indigo-950 dark:text-indigo-50"
                      : "text-amber-700 dark:text-amber-300",
                  )}
                >
                  {driverName ?? "Chưa phân"}
                  {booking.driver?.phone ? ` · ${booking.driver.phone}` : ""}
                </dd>
              </div>
            </dl>

            {canAssign ? (
              <div className="space-y-3 border-t border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
                <div className="space-y-2">
                  <Label>Chọn xe</Label>
                  <div className="flex gap-2">
                    <Select value={vehicleId} onValueChange={setVehicleId}>
                      <SelectTrigger className="flex-1 bg-background">
                        <SelectValue placeholder="Xe" />
                      </SelectTrigger>
                      <SelectContent>
                        {(availVehicles.length > 0
                          ? availVehicles
                          : vehicles
                              .filter((v) => v.active)
                              .map((v) => ({
                                id: v.id,
                                name: v.name,
                                seats: v.seats,
                                available: true as boolean,
                              }))
                        ).map((v) => (
                          <SelectItem
                            key={v.id}
                            value={v.id}
                            disabled={
                              !v.available && v.id !== booking.vehicleId
                            }
                          >
                            {v.name}
                            {"seats" in v && v.seats != null
                              ? ` (${v.seats} chỗ)`
                              : ""}
                            {!v.available && v.id !== booking.vehicleId
                              ? " · Trùng lịch"
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      className="bg-indigo-700 hover:bg-indigo-600"
                      disabled={busy || !vehicleId}
                      aria-label="Lưu xe"
                      onClick={() =>
                        void run({ action: "assignVehicle", vehicleId })
                      }
                    >
                      <Check className="size-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phân tài xế</Label>
                  <div className="flex gap-2">
                    <Select value={driverId} onValueChange={setDriverId}>
                      <SelectTrigger className="flex-1 bg-background">
                        <SelectValue placeholder="Tài xế" />
                      </SelectTrigger>
                      <SelectContent>
                        {(availDrivers.length > 0
                          ? availDrivers
                          : drivers
                              .filter((d) => d.active)
                              .map((d) => ({
                                id: d.id,
                                name: d.name,
                                status: d.status,
                                available: true as boolean,
                              }))
                        ).map((d) => (
                          <SelectItem
                            key={d.id}
                            value={d.id}
                            disabled={
                              !d.available && d.id !== booking.driverId
                            }
                          >
                            {d.name}
                            {"status" in d && d.status
                              ? ` · ${d.status === "ON_TRIP" ? "Đang chạy" : "Rảnh"}`
                              : ""}
                            {!d.available && d.id !== booking.driverId
                              ? " · Trùng lịch"
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      className="bg-indigo-700 hover:bg-indigo-600"
                      disabled={busy || !driverId}
                      aria-label="Lưu tài xế"
                      onClick={() =>
                        void run({ action: "assignDriver", driverId })
                      }
                    >
                      <Check className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </aside>

        {/* Finance — full width */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50/80 px-4 py-2.5 dark:border-emerald-900/60 dark:bg-emerald-950/40">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm">
                <Calculator className="size-3.5" />
              </span>
              <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Báo giá / Tài chính
              </h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-emerald-200 bg-white/80 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
              disabled={busy || calcBusy || booking.tripType === "CUSTOM"}
              onClick={() => void calculateAutoQuote()}
            >
              {calcBusy ? "Đang tính…" : "Tính tự động"}
            </Button>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              {booking.tripType === "CUSTOM" ? (
                <p className="text-xs text-muted-foreground">
                  Chuyến tùy chỉnh — nhập giá thủ công
                </p>
              ) : null}

              {snapshot ? (
                <div className="space-y-2 rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="text-xs font-semibold tracking-wide text-emerald-800 uppercase dark:text-emerald-200">
                    {draftQuote ? "Dự kiến (chưa lưu)" : "Snapshot đã lưu"}
                  </p>
                  <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <li>
                      Quãng đường:{" "}
                      {"distanceKm" in snapshot && snapshot.distanceKm != null
                        ? `${snapshot.distanceKm} km`
                        : "—"}
                    </li>
                    <li>
                      Thời gian:{" "}
                      {"durationMinutes" in snapshot &&
                      snapshot.durationMinutes != null
                        ? formatDurationMinutes(snapshot.durationMinutes)
                        : "—"}
                    </li>
                    <li>
                      Nhiên liệu:{" "}
                      {draftQuote?.fuelLiters != null
                        ? `${draftQuote.fuelLiters} L (${formatCurrency(draftQuote.fuelCost ?? 0)})`
                        : booking.quoteSnapshot
                          ? `${booking.quoteSnapshot.fuelLiters} L (${formatCurrency(booking.quoteSnapshot.fuelCost)})`
                          : "—"}
                    </li>
                    <li>
                      Phí tài xế:{" "}
                      {formatCurrency(
                        draftQuote?.driverCost ??
                          booking.quoteSnapshot?.driverFee ??
                          0,
                      )}
                    </li>
                  </ul>
                  <ul className="space-y-1 border-t border-emerald-200/80 pt-2 dark:border-emerald-900">
                    {(
                      draftQuote?.breakdown ??
                      booking.quoteSnapshot?.breakdown ??
                      []
                    ).map((line) => (
                      <li
                        key={line.label}
                        className="flex justify-between gap-2 text-muted-foreground"
                      >
                        <span>{line.label}</span>
                        <span className="tabular-nums font-medium text-emerald-900 dark:text-emerald-100">
                          {formatCurrency(line.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-emerald-200/80 bg-emerald-50/30 p-4 text-sm text-muted-foreground dark:border-emerald-900 dark:bg-emerald-950/20">
                  Chưa có snapshot báo giá. Bấm “Tính tự động” hoặc nhập giá
                  thủ công.
                </div>
              )}
            </div>

            <div className="space-y-3 lg:col-span-7">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Giá chuyến</Label>
                  <MoneyInput
                    value={quote}
                    onChange={(v) => {
                      setQuote(v);
                      setDraftSnapshot(null);
                    }}
                    placeholder="Chưa báo giá"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tiền cọc</Label>
                  <MoneyInput value={deposit} onChange={setDeposit} />
                </div>
                <div className="space-y-2">
                  <Label>Đã thanh toán</Label>
                  <MoneyInput value={paid} onChange={setPaid} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50/60 px-3 py-2.5 dark:bg-emerald-950/30">
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                  {booking.quotedPrice == null
                    ? "Chưa báo giá"
                    : `Còn lại: ${formatCurrency(Math.max(0, remaining))}`}
                </p>
                <Button
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-600"
                  disabled={busy}
                  onClick={() => {
                    void (async () => {
                      const ok = await run({
                        action: "quote",
                        quotedPrice: quote > 0 ? quote : null,
                        deposit,
                        paidAmount: paid,
                        quoteSnapshot:
                          draftSnapshot ?? booking.quoteSnapshot ?? null,
                        pricingSnapshot:
                          draftPricingSnapshot ??
                          booking.pricingSnapshot ??
                          null,
                      });
                      if (ok) {
                        setDraftQuote(null);
                        setDraftSnapshot(null);
                        setDraftPricingSnapshot(null);
                      }
                    })();
                  }}
                >
                  <Check className="size-4" />
                  Lưu báo giá
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
