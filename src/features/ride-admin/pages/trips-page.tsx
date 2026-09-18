import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/features/auth/can";
import {
  AdminFilterBar,
  filterControlClass,
  filterSearchClass,
  filterSearchFormClass,
} from "@/features/ride-admin/components/admin-filter-bar";
import { ColumnVisibilityMenu } from "@/features/ride-admin/components/column-visibility-menu";
import { ConfirmDeleteDialog } from "@/features/ride-admin/components/confirm-delete-dialog";
import { TripStatusBadge } from "@/features/ride-admin/components/trip-status-badge";
import {
  useColumnVisibility,
  type ColumnDef,
} from "@/features/ride-admin/lib/column-visibility";
import { TripFormDialog } from "@/features/ride-admin/pages/trip-form-dialog";
import {
  driverAdminService,
  tripAdminService,
  vehicleAdminService,
} from "@/features/ride-admin/services/admin-api";
import {
  TRIP_STATUS_LABELS,
  TRIP_TYPE_LABELS,
} from "@/features/ride/lib/labels";
import type {
  Driver,
  RideTrip,
  TripStatus,
  TripType,
  Vehicle,
} from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { PERMISSIONS } from "@/config/permissions";
import { cn } from "@/lib/utils";
import { formatRideDateTime } from "@/features/ride-admin/lib/format";

const STATUSES = Object.keys(TRIP_STATUS_LABELS) as TripStatus[];
const TYPES = Object.keys(TRIP_TYPE_LABELS) as TripType[];

type TripColumnId =
  | "code"
  | "customer"
  | "route"
  | "pickup"
  | "tripType"
  | "vehicle"
  | "driver"
  | "price"
  | "status";

const TRIP_COLUMNS: ColumnDef<TripColumnId>[] = [
  { id: "code", label: "Mã", locked: true, defaultVisible: true },
  { id: "customer", label: "Khách", locked: true, defaultVisible: true },
  { id: "route", label: "Hành trình", defaultVisible: true },
  { id: "pickup", label: "Ngày đón", defaultVisible: true },
  { id: "tripType", label: "Loại", defaultVisible: false },
  { id: "vehicle", label: "Xe", defaultVisible: false },
  { id: "driver", label: "Tài xế", defaultVisible: false },
  { id: "price", label: "Giá", defaultVisible: true },
  { id: "status", label: "TT", locked: true, defaultVisible: true },
];

export function RideAdminTripsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";
  const [rows, setRows] = useState<RideTrip[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [formOpen, setFormOpen] = useState(() =>
    Boolean(searchParams.get("bookingId")),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<RideTrip | null>(null);
  const columns = useColumnVisibility(
    "ride-admin.trips.visible-columns",
    TRIP_COLUMNS,
  );

  const status = searchParams.get("status") ?? "";
  const date = searchParams.get("date") ?? "";
  const tripType = searchParams.get("tripType") ?? "";
  const vehicleId = searchParams.get("vehicleId") ?? "";
  const driverId = searchParams.get("driverId") ?? "";

  function patchParams(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all") next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next);
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        setError(null);
        try {
          const [list, veh, drv] = await Promise.all([
            tripAdminService.list({
              status: status || undefined,
              q: searchParams.get("q") || undefined,
              date: date || undefined,
              tripType: tripType || undefined,
              vehicleId: vehicleId || undefined,
              driverId: driverId || undefined,
            }),
            vehicleAdminService.list(),
            driverAdminService.list(),
          ]);
          if (cancelled) return;
          setRows(list);
          setVehicles(veh);
          setDrivers(drv);
        } catch (e) {
          if (cancelled) return;
          setError(e instanceof ApiError ? e.message : "Không tải chuyến xe");
          setRows([]);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [status, date, tripType, vehicleId, driverId, searchParams]);

  async function reload() {
    setError(null);
    const [list, veh, drv] = await Promise.all([
      tripAdminService.list({
        status: status || undefined,
        q: searchParams.get("q") || undefined,
        date: date || undefined,
        tripType: tripType || undefined,
        vehicleId: vehicleId || undefined,
        driverId: driverId || undefined,
      }),
      vehicleAdminService.list(),
      driverAdminService.list(),
    ]);
    setRows(list);
    setVehicles(veh);
    setDrivers(drv);
  }

  const dialogOpen = formOpen || Boolean(bookingId);

  function vehicleName(id?: string | null) {
    if (!id) return "—";
    return vehicles.find((v) => v.id === id)?.name ?? "—";
  }

  function driverName(id?: string | null) {
    if (!id) return "—";
    return drivers.find((d) => d.id === id)?.name ?? "—";
  }

  async function remove(trip: RideTrip) {
    setBusyId(trip.id);
    setError(null);
    try {
      await tripAdminService.delete(trip.id);
      toast.success("Đã xóa chuyến xe");
      setDeleting(null);
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không xóa được chuyến");
    } finally {
      setBusyId(null);
    }
  }

  const qParam = searchParams.get("q") ?? "";
  const activeFilterCount = [
    qParam,
    date,
    status,
    tripType,
    vehicleId,
    driverId,
  ].filter(Boolean).length;

  const colSpan = columns.visibleCount + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Chuyến xe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý lịch trình vận hành, phân xe và tài xế
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ColumnVisibilityMenu
            columns={TRIP_COLUMNS}
            isVisible={columns.isVisible}
            toggle={columns.toggle}
            reset={columns.reset}
          />
          <Can permission={PERMISSIONS.FLEET_TRIP_CREATE}>
            <Button
              className="gap-1.5 bg-teal-800 hover:bg-teal-700"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="size-4" />
              Tạo chuyến
            </Button>
          </Can>
        </div>
      </div>

      <AdminFilterBar activeCount={activeFilterCount}>
        <form
          className={filterSearchFormClass}
          onSubmit={(e) => {
            e.preventDefault();
            patchParams({ q });
          }}
        >
          <Input
            className={filterSearchClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã chuyến / booking / khách / điểm đến"
          />
          <Button
            type="submit"
            size="sm"
            className="h-9 shrink-0 bg-teal-800 hover:bg-teal-700"
          >
            Tìm
          </Button>
        </form>
        <Input
          type="date"
          className={cn(filterControlClass, "w-[10.5rem]")}
          value={date}
          onChange={(e) => patchParams({ date: e.target.value })}
        />
        <Select
          value={status || "all"}
          onValueChange={(v) => patchParams({ status: v })}
        >
          <SelectTrigger className={filterControlClass}>
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {TRIP_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={tripType || "all"}
          onValueChange={(v) => patchParams({ tripType: v })}
        >
          <SelectTrigger className={filterControlClass}>
            <SelectValue placeholder="Loại chuyến" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TRIP_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={vehicleId || "all"}
          onValueChange={(v) => patchParams({ vehicleId: v })}
        >
          <SelectTrigger className={filterControlClass}>
            <SelectValue placeholder="Xe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả xe</SelectItem>
            {vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={driverId || "all"}
          onValueChange={(v) => patchParams({ driverId: v })}
        >
          <SelectTrigger className={filterControlClass}>
            <SelectValue placeholder="Tài xế" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả tài xế</SelectItem>
            {drivers.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminFilterBar>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-3 lg:hidden">
        {rows === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : rows.length === 0
            ? (
              <p className="text-sm text-muted-foreground">
                Chưa có chuyến xe.
              </p>
            )
            : rows.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <Link to={`/admin/trips/${t.id}`} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-sm font-semibold">
                        {t.tripCode || t.id.slice(0, 8)}
                      </p>
                      <TripStatusBadge status={t.status} />
                    </div>
                    <p className="mt-2 text-sm font-medium">
                      {t.customer?.name ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t.routeLabel ||
                        `${t.pickup?.address ?? "—"} → ${t.destination?.address ?? "—"}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRideDateTime(t.pickupDate, t.pickupTime)} ·{" "}
                      {vehicleName(t.vehicleId)}
                    </p>
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/trips/${t.id}`}>Chi tiết</Link>
                    </Button>
                    <Can permission={PERMISSIONS.FLEET_TRIP_DELETE}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={busyId === t.id}
                        onClick={() => setDeleting(t)}
                      >
                        <Trash2 className="size-3.5" />
                        Xóa
                      </Button>
                    </Can>
                  </div>
                </div>
              ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {columns.isVisible("code") ? (
                <th className="px-3 py-3 font-medium">Mã</th>
              ) : null}
              {columns.isVisible("customer") ? (
                <th className="px-3 py-3 font-medium">Khách</th>
              ) : null}
              {columns.isVisible("route") ? (
                <th className="px-3 py-3 font-medium">Hành trình</th>
              ) : null}
              {columns.isVisible("pickup") ? (
                <th className="px-3 py-3 font-medium">Ngày đón</th>
              ) : null}
              {columns.isVisible("tripType") ? (
                <th className="px-3 py-3 font-medium">Loại</th>
              ) : null}
              {columns.isVisible("vehicle") ? (
                <th className="px-3 py-3 font-medium">Xe</th>
              ) : null}
              {columns.isVisible("driver") ? (
                <th className="px-3 py-3 font-medium">Tài xế</th>
              ) : null}
              {columns.isVisible("price") ? (
                <th className="px-3 py-3 font-medium">Giá</th>
              ) : null}
              {columns.isVisible("status") ? (
                <th className="px-3 py-3 font-medium">TT</th>
              ) : null}
              <th className="px-3 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-6">
                  <Skeleton className="h-8 w-full" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Chưa có chuyến xe.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="border-b border-border/60">
                  {columns.isVisible("code") ? (
                    <td className="px-3 py-3 font-mono text-xs font-semibold">
                      {t.tripCode}
                      {t.bookingCode ? (
                        <div className="font-sans text-[11px] text-muted-foreground">
                          #{t.bookingCode}
                        </div>
                      ) : null}
                    </td>
                  ) : null}
                  {columns.isVisible("customer") ? (
                    <td className="px-3 py-3">
                      <div>{t.customer?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.customer?.phone ?? "—"}
                      </div>
                    </td>
                  ) : null}
                  {columns.isVisible("route") ? (
                    <td className="max-w-[180px] px-3 py-3">
                      <div className="truncate">
                        {t.pickup?.address ?? "—"}
                      </div>
                      <div className="truncate text-muted-foreground">
                        → {t.destination?.address ?? "—"}
                      </div>
                    </td>
                  ) : null}
                  {columns.isVisible("pickup") ? (
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatRideDateTime(t.pickupDate, t.pickupTime)}
                    </td>
                  ) : null}
                  {columns.isVisible("tripType") ? (
                    <td className="px-3 py-3">
                      {TRIP_TYPE_LABELS[t.tripType] ?? t.tripType ?? "—"}
                    </td>
                  ) : null}
                  {columns.isVisible("vehicle") ? (
                    <td className="px-3 py-3">{vehicleName(t.vehicleId)}</td>
                  ) : null}
                  {columns.isVisible("driver") ? (
                    <td className="px-3 py-3">{driverName(t.driverId)}</td>
                  ) : null}
                  {columns.isVisible("price") ? (
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatCurrency(t.tripPrice || 0)}
                    </td>
                  ) : null}
                  {columns.isVisible("status") ? (
                    <td className="px-3 py-3">
                      <TripStatusBadge status={t.status} />
                    </td>
                  ) : null}
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/trips/${t.id}`}>Chi tiết</Link>
                      </Button>
                      <Can permission={PERMISSIONS.FLEET_TRIP_DELETE}>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === t.id}
                          onClick={() => setDeleting(t)}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Xóa</span>
                        </Button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !busyId) setDeleting(null);
        }}
        title="Xóa chuyến xe?"
        description={
          deleting
            ? `Xóa chuyến ${deleting.tripCode || deleting.id.slice(0, 8)}. Thao tác này không thể hoàn tác.`
            : ""
        }
        pending={!!busyId}
        onConfirm={() => {
          if (!deleting) return;
          void remove(deleting);
        }}
      />

      <TripFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open && bookingId) {
            const next = new URLSearchParams(searchParams);
            next.delete("bookingId");
            setSearchParams(next, { replace: true });
          }
        }}
        bookingId={bookingId || undefined}
        vehicles={vehicles}
        drivers={drivers}
        onSaved={(trip) => {
          toast.success("Đã lưu chuyến xe");
          setFormOpen(false);
          void navigate(`/admin/trips/${trip.id}`);
        }}
      />
    </div>
  );
}
