import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { EditIcon } from "@/components/icons";
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
import { Can } from "@/features/auth/can";
import {
  TripStatusBadge,
} from "@/features/ride-admin/components/trip-status-badge";
import { TripFormDialog } from "@/features/ride-admin/pages/trip-form-dialog";
import {
  driverAdminService,
  tripAdminService,
  vehicleAdminService,
} from "@/features/ride-admin/services/admin-api";
import {
  TRIP_STATUS_LABELS,
  TRIP_TYPE_LABELS,
  nextTripStatuses,
} from "@/features/ride/lib/labels";
import type {
  Driver,
  RideTrip,
  TripStatus,
  Vehicle,
} from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { PERMISSIONS } from "@/config/permissions";
import { cn } from "@/lib/utils";

export function RideAdminTripDetailPage() {
  const { id = "" } = useParams();
  const [trip, setTrip] = useState<RideTrip | null | undefined>(undefined);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");

  async function load() {
    setError(null);
    try {
      const [t, v, d] = await Promise.all([
        tripAdminService.get(id),
        vehicleAdminService.list(),
        driverAdminService.list(),
      ]);
      setTrip(t);
      setVehicles(v);
      setDrivers(d);
      setVehicleId(t.vehicleId || "");
      setDriverId(t.driverId || "");
    } catch (e) {
      setTrip(null);
      setError(e instanceof ApiError ? e.message : "Không tải chuyến xe");
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
      const updated = await tripAdminService.action(id, body);
      setTrip(updated);
      setVehicleId(updated.vehicleId || "");
      setDriverId(updated.driverId || "");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  if (trip === undefined) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (!trip) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{error ?? "Không tìm thấy"}</p>
        <Button asChild variant="outline">
          <Link to="/admin/trips">Quay lại</Link>
        </Button>
      </div>
    );
  }

  const vehicle = vehicles.find((v) => v.id === trip.vehicleId);
  const driver = drivers.find((d) => d.id === trip.driverId);
  const next = nextTripStatuses(trip.status);
  const terminal = trip.status === "COMPLETED" || trip.status === "CANCELLED";
  const profit = (trip.revenueAmount || 0) - (trip.expenseTotal || 0);

  function statusButtonLabel(s: TripStatus): string {
    if (s === "CANCELLED") return "Hủy chuyến";
    if (s === "CONFIRMED") return "Xác nhận";
    if (s === "ASSIGNED") return "Đánh dấu đã phân";
    if (s === "IN_PROGRESS") return "Bắt đầu chuyến";
    if (s === "COMPLETED") return "Hoàn thành";
    return TRIP_STATUS_LABELS[s];
  }

  return (
    <div className={cn("mx-auto max-w-3xl space-y-6", !terminal && "pb-28")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/admin/trips">← Chuyến xe</Link>
          </Button>
          <h1 className="font-mono text-2xl font-semibold">{trip.tripCode}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <TripStatusBadge status={trip.status} />
            <span className="text-sm text-muted-foreground">
              {TRIP_TYPE_LABELS[trip.tripType] ?? trip.tripType ?? "—"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {trip.bookingId ? (
            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/bookings/${trip.bookingId}`}>
                Booking {trip.bookingCode ? `#${trip.bookingCode}` : ""}
              </Link>
            </Button>
          ) : null}
          <Can permission={PERMISSIONS.FLEET_TRIP_UPDATE}>
            {!terminal ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditOpen(true)}
              >
                <EditIcon size={14} />
                Sửa
              </Button>
            ) : null}
          </Can>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Thông tin chuyến
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Ngày giờ đón</dt>
            <dd className="font-medium">
              {trip.pickupDate} · {trip.pickupTime}
            </dd>
          </div>
          {trip.returnDate ? (
            <div>
              <dt className="text-muted-foreground">Ngày giờ về</dt>
              <dd className="font-medium">
                {trip.returnDate}
                {trip.returnTime ? ` · ${trip.returnTime}` : ""}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Số khách</dt>
            <dd className="font-medium">{trip.passengers}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cập nhật</dt>
            <dd className="font-medium">
              {new Date(trip.updatedAt).toLocaleString("vi-VN")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Khách hàng
        </h2>
        <p className="mt-2 font-medium">
          {trip.customerId ? (
            <Link
              className="underline-offset-2 hover:underline"
              to={`/admin/customers/${trip.customerId}`}
            >
              {trip.customer?.name ?? "—"}
            </Link>
          ) : (
            (trip.customer?.name ?? "—")
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {trip.customer?.phone ?? "—"}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Lộ trình
        </h2>
        {trip.routeLabel ? (
          <p className="mt-2 text-sm font-medium">{trip.routeLabel}</p>
        ) : null}
        <p className="mt-2 text-sm">
          {trip.pickup?.address ?? "—"}
          <br />
          <span className="text-muted-foreground">→</span>{" "}
          {trip.destination?.address ?? "—"}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Xe & tài xế
        </h2>
        <p className="mt-2 text-sm">
          Xe:{" "}
          <strong>
            {vehicle ? (
              <Link
                className="underline-offset-2 hover:underline"
                to={`/admin/vehicles/${vehicle.id}`}
              >
                {vehicle.name}
              </Link>
            ) : (
              "Chưa phân"
            )}
          </strong>
          {vehicle?.licensePlate ? ` · ${vehicle.licensePlate}` : ""}
        </p>
        <p className="mt-1 text-sm">
          Tài xế:{" "}
          <strong>
            {driver ? (
              <Link
                className="underline-offset-2 hover:underline"
                to={`/admin/drivers/${driver.id}`}
              >
                {driver.name}
              </Link>
            ) : (
              "Chưa phân"
            )}
          </strong>
          {driver?.phone ? ` · ${driver.phone}` : ""}
        </p>

        {!terminal ? (
          <Can permission={PERMISSIONS.FLEET_TRIP_UPDATE}>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Chọn xe</Label>
                <Select value={vehicleId || "none"} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Xe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa chọn</SelectItem>
                    {vehicles
                      .filter((v) => v.active)
                      .map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chọn tài xế</Label>
                <Select value={driverId || "none"} onValueChange={setDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tài xế" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa chọn</SelectItem>
                    {drivers
                      .filter((d) => d.active)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="sm:col-span-2 bg-teal-800 hover:bg-teal-700"
                disabled={busy || !vehicleId || vehicleId === "none" || !driverId || driverId === "none"}
                onClick={() =>
                  void run({
                    action: "assign",
                    vehicleId: vehicleId === "none" ? null : vehicleId,
                    driverId: driverId === "none" ? null : driverId,
                  })
                }
              >
                Lưu phân công
              </Button>
            </div>
          </Can>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Doanh thu & chi phí
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Giá chuyến</dt>
            <dd className="font-medium">{formatCurrency(trip.tripPrice || 0)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Chi phí</dt>
            <dd className="font-medium">
              {formatCurrency(trip.expenseTotal || 0)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Doanh thu ghi nhận</dt>
            <dd className="font-medium">
              {formatCurrency(trip.revenueAmount || 0)}
            </dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-muted-foreground">Lợi nhuận tạm tính</dt>
            <dd className="font-medium">{formatCurrency(profit)}</dd>
          </div>
        </dl>
      </section>

      {trip.note ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Ghi chú
          </h2>
          <p className="mt-2 text-sm whitespace-pre-wrap">{trip.note}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Timeline trạng thái
        </h2>
        <ol className="mt-4 space-y-3">
          {(trip.statusHistory ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">Chưa có lịch sử</li>
          ) : (
            [...(trip.statusHistory ?? [])]
              .slice()
              .reverse()
              .map((ev, i) => (
                <li
                  key={`${ev.at}-${ev.status}-${i}`}
                  className="flex items-start gap-3 border-l-2 border-border pl-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TripStatusBadge status={ev.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(ev.at).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    {ev.note ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ev.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))
          )}
        </ol>
      </section>

      {!terminal ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:rounded-2xl md:border md:bg-card md:p-4 md:pb-4 md:backdrop-blur-none">
          <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
            {next.map((s) => {
              const isCancel = s === "CANCELLED";
              const isComplete = s === "COMPLETED";
              const permission = isComplete
                ? PERMISSIONS.FLEET_TRIP_COMPLETE
                : PERMISSIONS.FLEET_TRIP_UPDATE;
              return (
                <Can key={s} permission={permission}>
                  <Button
                    disabled={busy}
                    variant={isCancel ? "destructive" : "default"}
                    className={cn(
                      "min-h-11 flex-1 sm:flex-none",
                      !isCancel && "bg-teal-800 hover:bg-teal-700",
                    )}
                    onClick={() =>
                      void run(
                        isCancel
                          ? { action: "cancel" }
                          : { action: "setStatus", status: s },
                      )
                    }
                  >
                    {isCancel ? <Trash2 className="size-4" /> : null}
                    {statusButtonLabel(s)}
                  </Button>
                </Can>
              );
            })}
          </div>
        </div>
      ) : null}

      <TripFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        trip={trip}
        vehicles={vehicles}
        drivers={drivers}
        onSaved={(updated) => {
          setTrip(updated);
          setEditOpen(false);
        }}
      />
    </div>
  );
}
