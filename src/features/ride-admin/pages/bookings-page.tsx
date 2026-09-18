import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
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
import { BookingStatusBadge } from "@/features/ride-admin/components/booking-status-badge";
import { ColumnVisibilityMenu } from "@/features/ride-admin/components/column-visibility-menu";
import { ConfirmDeleteDialog } from "@/features/ride-admin/components/confirm-delete-dialog";
import {
  AdminFilterBar,
  filterControlClass,
  filterSearchClass,
  filterSearchFormClass,
} from "@/features/ride-admin/components/admin-filter-bar";
import {
  useColumnVisibility,
  type ColumnDef,
} from "@/features/ride-admin/lib/column-visibility";
import { rideAdminQueryKeys } from "@/features/ride-admin/query-keys";
import {
  bookingAdminService,
  driverAdminService,
  vehicleAdminService,
} from "@/features/ride-admin/services/admin-api";
import {
  BOOKING_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/features/ride/lib/labels";
import type {
  BookingStatus,
  ServiceType,
  TripBooking,
} from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { PERMISSIONS } from "@/config/permissions";
import { cn } from "@/lib/utils";
import {
  formatRideDateTime,
  formatRideTimestamp,
} from "@/features/ride-admin/lib/format";

const STATUSES = Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[];
const SERVICES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];

type BookingColumnId =
  | "code"
  | "customer"
  | "route"
  | "pickup"
  | "createdAt"
  | "service"
  | "vehicle"
  | "driver"
  | "price"
  | "status";

const BOOKING_COLUMNS: ColumnDef<BookingColumnId>[] = [
  { id: "code", label: "Mã", locked: true, defaultVisible: true },
  { id: "customer", label: "Khách", locked: true, defaultVisible: true },
  { id: "route", label: "Hành trình", defaultVisible: true },
  { id: "pickup", label: "Ngày đón", defaultVisible: true },
  { id: "createdAt", label: "Đặt lúc", defaultVisible: false },
  { id: "service", label: "Dịch vụ", defaultVisible: false },
  { id: "vehicle", label: "Xe", defaultVisible: false },
  { id: "driver", label: "Tài xế", defaultVisible: false },
  { id: "price", label: "Giá", defaultVisible: true },
  { id: "status", label: "TT", locked: true, defaultVisible: true },
];

export function RideAdminBookingsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [deleting, setDeleting] = useState<TripBooking | null>(null);
  const columns = useColumnVisibility(
    "ride-admin.bookings.visible-columns",
    BOOKING_COLUMNS,
  );

  const status = searchParams.get("status") ?? "";
  const date = searchParams.get("date") ?? "";
  const serviceType = searchParams.get("serviceType") ?? "";
  const vehicleId = searchParams.get("vehicleId") ?? "";
  const driverId = searchParams.get("driverId") ?? "";
  const qParam = searchParams.get("q") ?? "";

  const filters = {
    status: status || undefined,
    q: qParam || undefined,
    date: date || undefined,
    serviceType: serviceType || undefined,
    vehicleId: vehicleId || undefined,
    driverId: driverId || undefined,
  };

  const bookingsQ = useQuery({
    queryKey: rideAdminQueryKeys.bookings(filters),
    queryFn: () => bookingAdminService.list(filters),
  });

  const vehiclesQ = useQuery({
    queryKey: rideAdminQueryKeys.vehicles(),
    queryFn: () => vehicleAdminService.list(),
  });

  const driversQ = useQuery({
    queryKey: rideAdminQueryKeys.drivers(),
    queryFn: () => driverAdminService.list(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => bookingAdminService.delete(id),
    onSuccess: async () => {
      toast.success("Đã xóa booking");
      setDeleting(null);
      await queryClient.invalidateQueries({
        queryKey: rideAdminQueryKeys.bookingsRoot(),
      });
    },
  });

  const rows = bookingsQ.data ?? null;
  const vehicles = vehiclesQ.data ?? [];
  const drivers = driversQ.data ?? [];
  let error: string | null = null;
  if (bookingsQ.error instanceof ApiError) error = bookingsQ.error.message;
  else if (bookingsQ.isError) error = "Không tải booking";
  else if (deleteMut.error instanceof ApiError) error = deleteMut.error.message;
  else if (deleteMut.isError) error = "Không xóa được booking";

  function patchParams(patch: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === "all") next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next);
  }

  function vehicleName(id: string) {
    return vehicles.find((v) => v.id === id)?.name ?? "—";
  }

  function driverName(id?: string | null) {
    if (!id) return "—";
    return drivers.find((d) => d.id === id)?.name ?? "—";
  }

  const activeFilterCount = [
    qParam,
    date,
    status,
    serviceType,
    vehicleId,
    driverId,
  ].filter(Boolean).length;

  const colSpan = columns.visibleCount + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Booking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý yêu cầu đặt chuyến từ khách hàng
          </p>
        </div>
        <ColumnVisibilityMenu
          columns={BOOKING_COLUMNS}
          isVisible={columns.isVisible}
          toggle={columns.toggle}
          reset={columns.reset}
        />
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
            placeholder="Mã / tên / SĐT / điểm đến"
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
                {BOOKING_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={serviceType || "all"}
          onValueChange={(v) => patchParams({ serviceType: v })}
        >
          <SelectTrigger className={filterControlClass}>
            <SelectValue placeholder="Dịch vụ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả dịch vụ</SelectItem>
            {SERVICES.map((s) => (
              <SelectItem key={s} value={s}>
                {SERVICE_TYPE_LABELS[s]}
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
        {bookingsQ.isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : rows && rows.length === 0
            ? (
              <p className="text-sm text-muted-foreground">Không có booking.</p>
            )
            : (rows ?? []).map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <Link to={`/admin/bookings/${b.id}`} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-mono text-sm font-semibold">
                        #{b.bookingCode}
                      </p>
                      <BookingStatusBadge status={b.status} />
                    </div>
                    <p className="mt-2 text-sm font-medium">{b.customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {b.pickup.address} → {b.destination.address}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Đón {formatRideDateTime(b.pickupDate, b.pickupTime)} ·{" "}
                      {vehicleName(b.vehicleId)}
                    </p>
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/bookings/${b.id}`}>Chi tiết</Link>
                    </Button>
                    <Can permission={PERMISSIONS.FLEET_BOOKING_DELETE}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleteMut.isPending}
                        onClick={() => setDeleting(b)}
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
              {columns.isVisible("createdAt") ? (
                <th className="px-3 py-3 font-medium">Đặt lúc</th>
              ) : null}
              {columns.isVisible("service") ? (
                <th className="px-3 py-3 font-medium">Dịch vụ</th>
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
            {bookingsQ.isLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-3 py-6">
                  <Skeleton className="h-8 w-full" />
                </td>
              </tr>
            ) : !rows || rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Không có booking.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="border-b border-border/60">
                  {columns.isVisible("code") ? (
                    <td className="px-3 py-3 font-mono text-xs font-semibold">
                      #{b.bookingCode}
                    </td>
                  ) : null}
                  {columns.isVisible("customer") ? (
                    <td className="px-3 py-3">
                      <div>{b.customer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.customer.phone}
                      </div>
                    </td>
                  ) : null}
                  {columns.isVisible("route") ? (
                    <td className="max-w-[180px] px-3 py-3">
                      <div className="truncate">{b.pickup.address}</div>
                      <div className="truncate text-muted-foreground">
                        → {b.destination.address}
                      </div>
                    </td>
                  ) : null}
                  {columns.isVisible("pickup") ? (
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatRideDateTime(b.pickupDate, b.pickupTime)}
                    </td>
                  ) : null}
                  {columns.isVisible("createdAt") ? (
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatRideTimestamp(b.createdAt)}
                    </td>
                  ) : null}
                  {columns.isVisible("service") ? (
                    <td className="px-3 py-3">
                      {SERVICE_TYPE_LABELS[b.serviceType]}
                    </td>
                  ) : null}
                  {columns.isVisible("vehicle") ? (
                    <td className="px-3 py-3">{vehicleName(b.vehicleId)}</td>
                  ) : null}
                  {columns.isVisible("driver") ? (
                    <td className="px-3 py-3">{driverName(b.driverId)}</td>
                  ) : null}
                  {columns.isVisible("price") ? (
                    <td className="px-3 py-3 whitespace-nowrap">
                      {b.quotedPrice == null
                        ? "Chưa báo giá"
                        : formatCurrency(b.quotedPrice)}
                    </td>
                  ) : null}
                  {columns.isVisible("status") ? (
                    <td className="px-3 py-3">
                      <BookingStatusBadge status={b.status} />
                    </td>
                  ) : null}
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/bookings/${b.id}`}>Chi tiết</Link>
                      </Button>
                      <Can permission={PERMISSIONS.FLEET_BOOKING_DELETE}>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={deleteMut.isPending}
                          onClick={() => setDeleting(b)}
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
          if (!open && !deleteMut.isPending) setDeleting(null);
        }}
        title="Xóa booking?"
        description={
          deleting
            ? `Xóa booking #${deleting.bookingCode}. Thao tác này không thể hoàn tác.`
            : ""
        }
        pending={deleteMut.isPending}
        onConfirm={() => {
          if (!deleting) return;
          deleteMut.mutate(deleting.id);
        }}
      />
    </div>
  );
}
