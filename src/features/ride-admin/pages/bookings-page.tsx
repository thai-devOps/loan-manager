import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { BookingStatusBadge } from "@/features/ride-admin/components/booking-status-badge";
import {
  AdminFilterBar,
  filterControlClass,
  filterSearchClass,
  filterSearchFormClass,
} from "@/features/ride-admin/components/admin-filter-bar";
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
} from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";
import {
  formatRideDateTime,
  formatRideTimestamp,
} from "@/features/ride-admin/lib/format";

const STATUSES = Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[];
const SERVICES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];

export function RideAdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

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

  const rows = bookingsQ.data ?? null;
  const vehicles = vehiclesQ.data ?? [];
  const drivers = driversQ.data ?? [];
  const error =
    bookingsQ.error instanceof ApiError
      ? bookingsQ.error.message
      : bookingsQ.isError
        ? "Không tải booking"
        : null;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Booking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý yêu cầu đặt chuyến từ khách hàng
        </p>
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
          <Button type="submit" size="sm" className="h-9 shrink-0 bg-teal-800 hover:bg-teal-700">
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
                <Link
                  key={b.id}
                  to={`/admin/bookings/${b.id}`}
                  className="block rounded-xl border border-border bg-card p-4"
                >
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
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Đặt {formatRideTimestamp(b.createdAt)}
                  </p>
                </Link>
              ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Mã</th>
              <th className="px-3 py-3 font-medium">Khách</th>
              <th className="px-3 py-3 font-medium">Hành trình</th>
              <th className="px-3 py-3 font-medium">Ngày đón</th>
              <th className="px-3 py-3 font-medium">Đặt lúc</th>
              <th className="px-3 py-3 font-medium">Dịch vụ</th>
              <th className="px-3 py-3 font-medium">Xe</th>
              <th className="px-3 py-3 font-medium">Tài xế</th>
              <th className="px-3 py-3 font-medium">Giá</th>
              <th className="px-3 py-3 font-medium">TT</th>
              <th className="px-3 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {bookingsQ.isLoading ? (
              <tr>
                <td colSpan={11} className="px-3 py-6">
                  <Skeleton className="h-8 w-full" />
                </td>
              </tr>
            ) : !rows || rows.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Không có booking.
                </td>
              </tr>
            ) : (
              rows.map((b) => (
                <tr key={b.id} className="border-b border-border/60">
                  <td className="px-3 py-3 font-mono text-xs font-semibold">
                    #{b.bookingCode}
                  </td>
                  <td className="px-3 py-3">
                    <div>{b.customer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.customer.phone}
                    </div>
                  </td>
                  <td className="max-w-[180px] px-3 py-3">
                    <div className="truncate">{b.pickup.address}</div>
                    <div className="truncate text-muted-foreground">
                      → {b.destination.address}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatRideDateTime(b.pickupDate, b.pickupTime)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {formatRideTimestamp(b.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    {SERVICE_TYPE_LABELS[b.serviceType]}
                  </td>
                  <td className="px-3 py-3">{vehicleName(b.vehicleId)}</td>
                  <td className="px-3 py-3">{driverName(b.driverId)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {b.quotedPrice == null
                      ? "Chưa báo giá"
                      : formatCurrency(b.quotedPrice)}
                  </td>
                  <td className="px-3 py-3">
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="px-3 py-3">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/bookings/${b.id}`}>Chi tiết</Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
