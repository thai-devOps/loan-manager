import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  bookingAdminService,
  driverAdminService,
  vehicleAdminService,
} from "@/features/ride-admin/services/admin-api";
import {
  SERVICE_TYPE_LABELS,
  TRIP_TYPE_LABELS,
} from "@/features/ride/lib/labels";
import type {
  BookingStatus,
  Driver,
  TripBooking,
  Vehicle,
} from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";

export function RideAdminBookingDetailPage() {
  const { id = "" } = useParams();
  const [booking, setBooking] = useState<TripBooking | null | undefined>(
    undefined,
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState("");
  const [deposit, setDeposit] = useState("");
  const [paid, setPaid] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");

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
      setQuote(b.quotedPrice != null ? String(b.quotedPrice) : "");
      setDeposit(String(b.deposit ?? 0));
      setPaid(String(b.paidAmount ?? 0));
      setVehicleId(b.vehicleId || "");
      setDriverId(b.driverId || "");
    } catch (e) {
      setBooking(null);
      setError(e instanceof ApiError ? e.message : "Không tải booking");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await bookingAdminService.action(id, body);
      setBooking(updated);
      setQuote(updated.quotedPrice != null ? String(updated.quotedPrice) : "");
      setDeposit(String(updated.deposit ?? 0));
      setPaid(String(updated.paidAmount ?? 0));
      setVehicleId(updated.vehicleId || "");
      setDriverId(updated.driverId || "");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
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
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Khách hàng
        </h2>
        <p className="mt-2 font-medium">{booking.customer.name}</p>
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
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Giá chuyến</Label>
            <Input
              inputMode="numeric"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Chưa báo giá"
            />
          </div>
          <div className="space-y-2">
            <Label>Tiền cọc</Label>
            <Input
              inputMode="numeric"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Đã thanh toán</Label>
            <Input
              inputMode="numeric"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
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
          onClick={() =>
            void run({
              action: "quote",
              quotedPrice: quote.trim() === "" ? null : Number(quote),
              deposit: Number(deposit) || 0,
              paidAmount: Number(paid) || 0,
            })
          }
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
