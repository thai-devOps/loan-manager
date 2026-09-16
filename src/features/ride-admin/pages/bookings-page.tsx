import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  Driver,
  ServiceType,
  TripBooking,
  Vehicle,
} from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";

const STATUSES = Object.keys(BOOKING_STATUS_LABELS) as BookingStatus[];
const SERVICES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];

export function RideAdminBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<TripBooking[] | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const status = searchParams.get("status") ?? "";
  const date = searchParams.get("date") ?? "";
  const serviceType = searchParams.get("serviceType") ?? "";
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
    void (async () => {
      setError(null);
      try {
        const [list, veh, drv] = await Promise.all([
          bookingAdminService.list({
            status: status || undefined,
            q: searchParams.get("q") || undefined,
            date: date || undefined,
            serviceType: serviceType || undefined,
            vehicleId: vehicleId || undefined,
            driverId: driverId || undefined,
          }),
          vehicleAdminService.list(),
          driverAdminService.list(),
        ]);
        if (!cancelled) {
          setRows(list);
          setVehicles(veh);
          setDrivers(drv);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Không tải booking");
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, date, serviceType, vehicleId, driverId, searchParams]);

  function vehicleName(id: string) {
    return vehicles.find((v) => v.id === id)?.name ?? "—";
  }

  function driverName(id?: string | null) {
    if (!id) return "—";
    return drivers.find((d) => d.id === id)?.name ?? "—";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Booking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý yêu cầu đặt chuyến từ khách hàng
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <form
          className="flex gap-2 sm:col-span-2 lg:col-span-3"
          onSubmit={(e) => {
            e.preventDefault();
            patchParams({ q });
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã / tên / SĐT / điểm đến"
          />
          <Button type="submit" className="bg-teal-800 hover:bg-teal-700">
            Tìm
          </Button>
        </form>
        <Input
          type="date"
          value={date}
          onChange={(e) => patchParams({ date: e.target.value })}
        />
        <Select
          value={status || "all"}
          onValueChange={(v) => patchParams({ status: v })}
        >
          <SelectTrigger>
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
          <SelectTrigger>
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
          <SelectTrigger>
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
          <SelectTrigger>
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
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {rows === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          : rows.length === 0
            ? (
              <p className="text-sm text-muted-foreground">Không có booking.</p>
            )
            : rows.map((b) => (
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
                    {b.pickupDate} {b.pickupTime} · {vehicleName(b.vehicleId)}
                  </p>
                </Link>
              ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Mã</th>
              <th className="px-3 py-3 font-medium">Khách</th>
              <th className="px-3 py-3 font-medium">Hành trình</th>
              <th className="px-3 py-3 font-medium">Ngày giờ</th>
              <th className="px-3 py-3 font-medium">Dịch vụ</th>
              <th className="px-3 py-3 font-medium">Xe</th>
              <th className="px-3 py-3 font-medium">Tài xế</th>
              <th className="px-3 py-3 font-medium">Giá</th>
              <th className="px-3 py-3 font-medium">TT</th>
              <th className="px-3 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={10} className="px-3 py-6">
                  <Skeleton className="h-8 w-full" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
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
                    {b.pickupDate}
                    <br />
                    {b.pickupTime}
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
