import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  bookingAdminService,
  driverAdminService,
  tripAdminService,
  vehicleAdminService,
} from "@/features/ride-admin/services/admin-api";
import {
  SERVICE_TYPE_LABELS,
  TRIP_TYPE_LABELS,
} from "@/features/ride/lib/labels";
import type {
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

function formatDurationMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} giờ`;
  return `${h} giờ ${m} phút`;
}

export function RideAdminBookingDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<TripBooking | null | undefined>(
    undefined,
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
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
      // Drop invalid / null-island coords so server geocodes from address
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
      });
      setDraftQuote(result);
      if (result.snapshot && result.amount != null) {
        setDraftSnapshot(result.snapshot);
        setQuote(result.amount);
      } else {
        setDraftSnapshot(null);
      }
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

  const remaining =
    (booking.quotedPrice ?? 0) - (booking.paidAmount ?? 0);
  const vehicle = vehicles.find((v) => v.id === booking.vehicleId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/admin/bookings">← Booking</Link>
          </Button>
          <h1 className="font-mono text-2xl font-semibold">
            #{booking.bookingCode}
          </h1>
          <div className="mt-2">
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.tripId ? (
            <Button asChild size="sm" className="bg-teal-800 hover:bg-teal-700">
              <Link to={`/admin/trips/${booking.tripId}`}>Xem chuyến</Link>
            </Button>
          ) : booking.status !== "PENDING" &&
            booking.status !== "CANCELLED" ? (
            <Can permission={PERMISSIONS.FLEET_TRIP_CREATE}>
              <Button
                size="sm"
                className="bg-teal-800 hover:bg-teal-700"
                disabled={busy || creatingTrip}
                onClick={() => {
                  void (async () => {
                    const tripId = await createTripFromBooking();
                    if (tripId) void navigate(`/admin/trips/${tripId}`);
                  })();
                }}
              >
                {creatingTrip ? "Đang tạo…" : "Tạo chuyến xe"}
              </Button>
            </Can>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Khách hàng
        </h2>
        <p className="mt-2 font-medium">
          {booking.customerId ? (
            <Link
              className="underline-offset-2 hover:underline"
              to={`/admin/customers/${booking.customerId}`}
            >
              {booking.customer.name}
            </Link>
          ) : (
            booking.customer.name
          )}
        </p>
        <p className="text-sm text-muted-foreground">{booking.customer.phone}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Chuyến đi
        </h2>
        <p className="mt-2 font-medium">
          {SERVICE_TYPE_LABELS[booking.serviceType]} ·{" "}
          {TRIP_TYPE_LABELS[booking.tripType]}
        </p>
        <p className="mt-2 text-sm">
          {booking.pickup.address}
          <br />
          <span className="text-muted-foreground">→</span>{" "}
          {booking.destination.address}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {booking.pickupDate} · {booking.pickupTime} · {booking.passengers}{" "}
          khách
        </p>
        {booking.note ? (
          <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">{booking.note}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Xe & tài xế
        </h2>
        <p className="mt-2 text-sm">
          Xe: <strong>{vehicle?.name ?? booking.vehicleId}</strong>
          {vehicle ? ` · ${vehicle.seats} chỗ` : ""}
        </p>
        <p className="mt-1 text-sm">
          Tài xế:{" "}
          <strong>
            {booking.driver?.name ??
              drivers.find((d) => d.id === booking.driverId)?.name ??
              "Chưa phân"}
          </strong>
          {booking.driver?.phone ? ` · ${booking.driver.phone}` : ""}
        </p>

        {(booking.status === "CONFIRMED" ||
          booking.status === "DRIVER_ASSIGNED") && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Chọn xe</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Xe" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles
                    .filter((v) => v.active)
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.seats} chỗ)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={busy || !vehicleId}
                onClick={() =>
                  void run({ action: "assignVehicle", vehicleId })
                }
              >
                Lưu xe
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Phân tài xế</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tài xế" />
                </SelectTrigger>
                <SelectContent>
                  {drivers
                    .filter((d) => d.active)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} · {d.status === "ON_TRIP" ? "Đang chạy" : "Rảnh"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={busy || !driverId}
                onClick={() => void run({ action: "assignDriver", driverId })}
              >
                Lưu tài xế
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Báo giá / Tài chính
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || calcBusy || booking.tripType === "CUSTOM"}
            onClick={() => void calculateAutoQuote()}
          >
            {calcBusy ? "Đang tính…" : "Tính báo giá tự động"}
          </Button>
          {booking.tripType === "CUSTOM" ? (
            <p className="self-center text-xs text-muted-foreground">
              Chuyến tùy chỉnh — nhập giá thủ công
            </p>
          ) : null}
        </div>

        {(draftQuote ?? booking.quoteSnapshot) ? (
          <div className="mt-4 space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium">
              {draftQuote ? "Báo giá dự kiến (chưa lưu)" : "Snapshot đã lưu"}
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              <li>
                Quãng đường:{" "}
                {(draftQuote?.distanceKm ?? booking.quoteSnapshot?.distanceKm) !=
                null
                  ? `${draftQuote?.distanceKm ?? booking.quoteSnapshot?.distanceKm} km`
                  : "—"}
              </li>
              <li>
                Thời gian:{" "}
                {(draftQuote?.durationMinutes ??
                  booking.quoteSnapshot?.durationMinutes) != null
                  ? formatDurationMinutes(
                      draftQuote?.durationMinutes ??
                        booking.quoteSnapshot!.durationMinutes,
                    )
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
            <ul className="space-y-1 border-t border-border pt-2">
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
                  <span>{formatCurrency(line.amount)}</span>
                </li>
              ))}
            </ul>
            {draftQuote?.errorMessage ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {draftQuote.errorMessage}
              </p>
            ) : null}
            {booking.quoteSnapshot && !draftQuote ? (
              <p className="text-xs text-muted-foreground">
                Lúc{" "}
                {new Date(booking.quoteSnapshot.quotedAt).toLocaleString(
                  "vi-VN",
                )}
                {booking.quoteSnapshot.provider
                  ? ` · ${booking.quoteSnapshot.provider}`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
        <p className="mt-3 text-sm text-muted-foreground">
          {booking.quotedPrice == null
            ? "Chưa báo giá"
            : `Còn lại: ${formatCurrency(Math.max(0, remaining))}`}
        </p>
        <Button
          className="mt-3 bg-teal-800 hover:bg-teal-700"
          disabled={busy}
          onClick={() => {
            void (async () => {
              const ok = await run({
                action: "quote",
                quotedPrice: quote > 0 ? quote : null,
                deposit,
                paidAmount: paid,
                quoteSnapshot: draftSnapshot ?? booking.quoteSnapshot ?? null,
              });
              if (ok) {
                setDraftQuote(null);
                setDraftSnapshot(null);
              }
            })();
          }}
        >
          Lưu báo giá
        </Button>
      </section>

      <section className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4">
        {booking.status === "PENDING" ? (
          <>
            <Button
              disabled={busy}
              className="bg-teal-800 hover:bg-teal-700"
              onClick={() => void run({ action: "confirm" })}
            >
              Xác nhận
            </Button>
            <Button
              disabled={busy}
              variant="destructive"
              onClick={() => void run({ action: "cancel" })}
            >
              Từ chối / Hủy
            </Button>
          </>
        ) : null}

        {booking.status === "DRIVER_ASSIGNED" ? (
          <>
            <Button
              disabled={busy}
              onClick={() =>
                void run({ action: "setStatus", status: "DRIVER_ARRIVING" as BookingStatus })
              }
            >
              Tài xế đang đến
            </Button>
            <Button
              disabled={busy}
              className="bg-teal-800 hover:bg-teal-700"
              onClick={() =>
                void run({ action: "setStatus", status: "IN_PROGRESS" as BookingStatus })
              }
            >
              Bắt đầu chuyến
            </Button>
          </>
        ) : null}

        {booking.status === "DRIVER_ARRIVING" ? (
          <Button
            disabled={busy}
            className="bg-teal-800 hover:bg-teal-700"
            onClick={() =>
              void run({ action: "setStatus", status: "IN_PROGRESS" as BookingStatus })
            }
          >
            Bắt đầu chuyến
          </Button>
        ) : null}

        {booking.status === "IN_PROGRESS" ? (
          <Button
            disabled={busy}
            className="bg-teal-800 hover:bg-teal-700"
            onClick={() =>
              void run({ action: "setStatus", status: "COMPLETED" as BookingStatus })
            }
          >
            Hoàn thành chuyến
          </Button>
        ) : null}

        {booking.status !== "CANCELLED" &&
        booking.status !== "COMPLETED" &&
        booking.status !== "PENDING" ? (
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => void run({ action: "cancel" })}
          >
            Hủy booking
          </Button>
        ) : null}
      </section>
    </div>
  );
}
