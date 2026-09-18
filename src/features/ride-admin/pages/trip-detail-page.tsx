import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { EditIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Can } from "@/features/auth/can";
import { TripStatusBadge } from "@/features/ride-admin/components/trip-status-badge";
import { TripFormDialog } from "@/features/ride-admin/pages/trip-form-dialog";
import {
  availabilityAdminService,
  bookingAdminService,
  driverAdminService,
  tripAdminService,
  vehicleAdminService,
  type AvailabilityOption,
} from "@/features/ride-admin/services/admin-api";
import {
  TRIP_STATUS_LABELS,
  TRIP_TYPE_LABELS,
  nextTripStatuses,
} from "@/features/ride/lib/labels";
import {
  formatRideDateTime,
  formatRideTimestamp,
} from "@/features/ride-admin/lib/format";
import type {
  Driver,
  RideTrip,
  TripActualCostItem,
  TripBooking,
  TripStatus,
  Vehicle,
} from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { PERMISSIONS } from "@/config/permissions";
import { cn } from "@/lib/utils";

type CostForm = {
  fuelLiters: string;
  fuelPricePerLiter: string;
  fuelAmount: string;
  driverFee: string;
  items: Array<{ id: string; name: string; amount: string; category: string }>;
};

function emptyCostForm(): CostForm {
  return {
    fuelLiters: "",
    fuelPricePerLiter: "",
    fuelAmount: "",
    driverFee: "",
    items: [],
  };
}

function costsToForm(trip: RideTrip): CostForm {
  const c = trip.actualCosts;
  return {
    fuelLiters: c?.fuelLiters != null ? String(c.fuelLiters) : "",
    fuelPricePerLiter:
      c?.fuelPricePerLiter != null ? String(c.fuelPricePerLiter) : "",
    fuelAmount: c?.fuelAmount != null ? String(c.fuelAmount) : "",
    driverFee: c?.driverFee != null ? String(c.driverFee) : "",
    items: (c?.items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      amount: String(item.amount),
      category: item.category || "other",
    })),
  };
}

export function RideAdminTripDetailPage() {
  const { id = "" } = useParams();
  const [trip, setTrip] = useState<RideTrip | null | undefined>(undefined);
  const [booking, setBooking] = useState<TripBooking | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [availVehicles, setAvailVehicles] = useState<AvailabilityOption[]>([]);
  const [availDrivers, setAvailDrivers] = useState<AvailabilityOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [costForm, setCostForm] = useState<CostForm>(emptyCostForm());
  const [costEditing, setCostEditing] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [startOdo, setStartOdo] = useState("");
  const [endOdo, setEndOdo] = useState("");

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
      setCostForm(costsToForm(t));
      setStartOdo(
        t.startOdometer != null
          ? String(t.startOdometer)
          : v.find((x) => x.id === t.vehicleId)?.currentOdometer != null
            ? String(v.find((x) => x.id === t.vehicleId)!.currentOdometer)
            : "",
      );
      setEndOdo(t.endOdometer != null ? String(t.endOdometer) : "");

      if (t.bookingId) {
        try {
          const b = await bookingAdminService.get(t.bookingId);
          setBooking(b);
        } catch {
          setBooking(null);
        }
      } else {
        setBooking(null);
      }

      try {
        const avail = await availabilityAdminService.get({ tripId: t.id });
        setAvailVehicles(avail.vehicles);
        setAvailDrivers(avail.drivers);
      } catch {
        setAvailVehicles([]);
        setAvailDrivers([]);
      }
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
      setCostForm(costsToForm(updated));
      if (body.action === "assign") {
        try {
          const avail = await availabilityAdminService.get({ tripId: updated.id });
          setAvailVehicles(avail.vehicles);
          setAvailDrivers(avail.drivers);
        } catch {
          /* ignore */
        }
      }
      return updated;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Thao tác thất bại");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const vehicleOptions = useMemo(() => {
    if (availVehicles.length > 0) return availVehicles;
    return vehicles
      .filter((v) => v.active)
      .map((v) => ({
        id: v.id,
        name: v.name,
        available: true,
        licensePlate: v.licensePlate,
        seats: v.seats,
      }));
  }, [availVehicles, vehicles]);

  const driverOptions = useMemo(() => {
    if (availDrivers.length > 0) return availDrivers;
    return drivers
      .filter((d) => d.active)
      .map((d) => ({
        id: d.id,
        name: d.name,
        available: true,
        phone: d.phone,
        status: d.status,
      }));
  }, [availDrivers, drivers]);

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
  const revenue = trip.tripPrice || trip.revenueAmount || 0;
  const hasActual =
    trip.actualCosts != null ||
    (trip.expenseTotal != null && trip.expenseTotal > 0);
  const expense = trip.expenseTotal || 0;
  const profit = hasActual ? revenue - expense : null;
  const quote = booking?.quoteSnapshot;
  const paidAmount = booking?.paidAmount ?? 0;
  const remainCollect = Math.max(0, revenue - paidAmount);

  const computedFuel =
    costForm.fuelLiters && costForm.fuelPricePerLiter
      ? Math.round(
          Number(costForm.fuelLiters) * Number(costForm.fuelPricePerLiter),
        )
      : null;

  function statusButtonLabel(s: TripStatus): string {
    if (s === "CANCELLED") return "Hủy chuyến";
    if (s === "CONFIRMED") return "Xác nhận";
    if (s === "ASSIGNED") return "Đánh dấu đã phân";
    if (s === "IN_PROGRESS") return "Bắt đầu chuyến";
    if (s === "COMPLETED") return "Hoàn thành";
    return TRIP_STATUS_LABELS[s];
  }

  async function saveActualCosts() {
    const fuelAmount =
      costForm.fuelAmount !== ""
        ? Number(costForm.fuelAmount)
        : computedFuel;
    const items: TripActualCostItem[] = costForm.items
      .filter((i) => i.name.trim() && Number(i.amount) > 0)
      .map((i, idx) => ({
        id: i.id || `item-${idx + 1}`,
        category: i.category || "other",
        name: i.name.trim(),
        amount: Math.max(0, Number(i.amount) || 0),
      }));
    await run({
      action: "setActualCosts",
      actualCosts: {
        fuelLiters:
          costForm.fuelLiters !== "" ? Number(costForm.fuelLiters) : null,
        fuelPricePerLiter:
          costForm.fuelPricePerLiter !== ""
            ? Number(costForm.fuelPricePerLiter)
            : null,
        fuelAmount: fuelAmount != null && Number.isFinite(fuelAmount) ? fuelAmount : null,
        driverFee:
          costForm.driverFee !== "" ? Number(costForm.driverFee) : null,
        items,
      },
    });
    setCostEditing(false);
  }

  async function completeWithOdo() {
    const end = Number(endOdo);
    if (!Number.isFinite(end) || end < 0) {
      setError("ODO cuối không hợp lệ");
      return;
    }
    const start = startOdo !== "" ? Number(startOdo) : null;
    if (start != null && end < start) {
      setError("ODO cuối phải ≥ ODO đầu");
      return;
    }
    const updated = await run({
      action: "setStatus",
      status: "COMPLETED",
      startOdometer: start,
      endOdometer: end,
    });
    if (updated) setCompleteOpen(false);
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
              {formatRideDateTime(trip.pickupDate, trip.pickupTime)}
            </dd>
          </div>
          {trip.returnDate ? (
            <div>
              <dt className="text-muted-foreground">Ngày giờ về</dt>
              <dd className="font-medium">
                {formatRideDateTime(trip.returnDate, trip.returnTime)}
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
              {formatRideTimestamp(trip.updatedAt)}
            </dd>
          </div>
          {(trip.startOdometer != null || trip.endOdometer != null) && (
            <>
              <div>
                <dt className="text-muted-foreground">ODO đầu</dt>
                <dd className="font-medium">
                  {trip.startOdometer?.toLocaleString("vi-VN") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ODO cuối</dt>
                <dd className="font-medium">
                  {trip.endOdometer?.toLocaleString("vi-VN") ?? "—"}
                </dd>
              </div>
            </>
          )}
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
                    {vehicleOptions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        disabled={!v.available && v.id !== trip.vehicleId}
                      >
                        {v.name}
                        {!v.available && v.id !== trip.vehicleId
                          ? " · Trùng lịch"
                          : ""}
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
                    {driverOptions.map((d) => (
                      <SelectItem
                        key={d.id}
                        value={d.id}
                        disabled={!d.available && d.id !== trip.driverId}
                      >
                        {d.name}
                        {!d.available && d.id !== trip.driverId
                          ? " · Trùng lịch"
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="sm:col-span-2 bg-teal-800 hover:bg-teal-700"
                disabled={
                  busy ||
                  !vehicleId ||
                  vehicleId === "none" ||
                  !driverId ||
                  driverId === "none"
                }
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
          Doanh thu
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Giá chuyến</dt>
            <dd className="font-medium">{formatCurrency(revenue)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Đã thanh toán</dt>
            <dd className="font-medium">{formatCurrency(paidAmount)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Còn thu</dt>
            <dd className="font-medium">{formatCurrency(remainCollect)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Chi phí thực tế
          </h2>
          <Can permission={PERMISSIONS.FLEET_TRIP_UPDATE}>
            {!costEditing ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCostForm(costsToForm(trip));
                  setCostEditing(true);
                }}
              >
                {hasActual ? "Sửa chi phí" : "Nhập chi phí"}
              </Button>
            ) : null}
          </Can>
        </div>

        {quote ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Dự kiến (từ báo giá)</p>
            <dl className="mt-2 grid gap-2 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Nhiên liệu</dt>
                <dd>{formatCurrency(quote.fuelCost)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phí tài xế</dt>
                <dd>{formatCurrency(quote.driverFee)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Chi phí VH</dt>
                <dd>{formatCurrency(quote.operatingCost)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {costEditing ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Số lít</Label>
                <Input
                  type="number"
                  value={costForm.fuelLiters}
                  onChange={(e) =>
                    setCostForm((f) => ({ ...f, fuelLiters: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Giá / lít</Label>
                <Input
                  type="number"
                  value={costForm.fuelPricePerLiter}
                  onChange={(e) =>
                    setCostForm((f) => ({
                      ...f,
                      fuelPricePerLiter: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tiền nhiên liệu</Label>
                <Input
                  type="number"
                  value={
                    costForm.fuelAmount ||
                    (computedFuel != null ? String(computedFuel) : "")
                  }
                  onChange={(e) =>
                    setCostForm((f) => ({ ...f, fuelAmount: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Phí tài xế thực tế</Label>
              <Input
                type="number"
                value={costForm.driverFee}
                onChange={(e) =>
                  setCostForm((f) => ({ ...f, driverFee: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Chi phí khác</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setCostForm((f) => ({
                      ...f,
                      items: [
                        ...f.items,
                        {
                          id: `item-${Date.now()}`,
                          name: "",
                          amount: "",
                          category: "other",
                        },
                      ],
                    }))
                  }
                >
                  + Thêm
                </Button>
              </div>
              {costForm.items.map((item, idx) => (
                <div key={item.id} className="flex gap-2">
                  <Input
                    placeholder="Tên"
                    value={item.name}
                    onChange={(e) =>
                      setCostForm((f) => {
                        const items = [...f.items];
                        items[idx] = { ...item, name: e.target.value };
                        return { ...f, items };
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Số tiền"
                    className="w-32"
                    value={item.amount}
                    onChange={(e) =>
                      setCostForm((f) => {
                        const items = [...f.items];
                        items[idx] = { ...item, amount: e.target.value };
                        return { ...f, items };
                      })
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setCostForm((f) => ({
                        ...f,
                        items: f.items.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-teal-800 hover:bg-teal-700"
                disabled={busy}
                onClick={() => void saveActualCosts()}
              >
                Lưu chi phí
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setCostForm(costsToForm(trip));
                  setCostEditing(false);
                }}
              >
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Nhiên liệu</dt>
              <dd className="font-medium">
                {trip.actualCosts?.fuelAmount != null
                  ? formatCurrency(trip.actualCosts.fuelAmount)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phí tài xế</dt>
              <dd className="font-medium">
                {trip.actualCosts?.driverFee != null
                  ? formatCurrency(trip.actualCosts.driverFee)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Khác</dt>
              <dd className="font-medium">
                {formatCurrency(
                  (trip.actualCosts?.items ?? []).reduce(
                    (s, i) => s + (i.amount || 0),
                    0,
                  ),
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tổng chi phí</dt>
              <dd className="font-medium">{formatCurrency(expense)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Lợi nhuận</dt>
              <dd className="font-medium">
                {profit != null ? formatCurrency(profit) : "Chưa đủ dữ liệu"}
              </dd>
            </div>
          </dl>
        )}
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
                        {formatRideTimestamp(ev.at)}
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
                    onClick={() => {
                      if (isComplete) {
                        setCompleteOpen(true);
                        return;
                      }
                      void run(
                        isCancel
                          ? { action: "cancel" }
                          : { action: "setStatus", status: s },
                      );
                    }}
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

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoàn thành chuyến — nhập ODO</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>ODO đầu</Label>
              <Input
                type="number"
                value={startOdo}
                onChange={(e) => setStartOdo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ODO cuối</Label>
              <Input
                type="number"
                value={endOdo}
                onChange={(e) => setEndOdo(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Hủy
            </Button>
            <Button
              className="bg-teal-800 hover:bg-teal-700"
              disabled={busy || endOdo === ""}
              onClick={() => void completeWithOdo()}
            >
              Xác nhận hoàn thành
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
