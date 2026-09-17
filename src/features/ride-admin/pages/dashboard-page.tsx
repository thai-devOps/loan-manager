import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingStatusBadge } from "@/features/ride-admin/components/booking-status-badge";
import { StatCard } from "@/features/ride-admin/components/stat-card";
import { rideAdminQueryKeys } from "@/features/ride-admin/query-keys";
import {
  bookingAdminService,
  dashboardService,
  vehicleAdminService,
} from "@/features/ride-admin/services/admin-api";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";

export function RideAdminDashboardPage() {
  const [range, setRange] = useState<"today" | "7d" | "month">("today");
  const queryClient = useQueryClient();

  const dashQ = useQuery({
    queryKey: rideAdminQueryKeys.dashboard(range),
    queryFn: () => dashboardService.get(range),
  });

  const vehiclesQ = useQuery({
    queryKey: rideAdminQueryKeys.vehicles(),
    queryFn: () => vehicleAdminService.list(),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) =>
      bookingAdminService.action(id, { action: "confirm" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: rideAdminQueryKeys.dashboardRoot(),
        }),
        queryClient.invalidateQueries({
          queryKey: rideAdminQueryKeys.bookingsRoot(),
        }),
      ]);
    },
  });

  const data = dashQ.data ?? null;
  const vehicles = vehiclesQ.data ?? [];
  const error =
    dashQ.error instanceof ApiError
      ? dashQ.error.message
      : dashQ.isError
        ? "Không tải được dashboard"
        : confirmMut.error instanceof ApiError
          ? confirmMut.error.message
          : confirmMut.isError
            ? "Xác nhận thất bại"
            : null;

  function vehicleName(id: string) {
    return vehicles.find((v) => v.id === id)?.name ?? id;
  }

  if (error && !data) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={() => void dashQ.refetch()}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng quan vận hành xe riêng có tài xế
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1">
          {(
            [
              ["today", "Hôm nay"],
              ["7d", "7 ngày"],
              ["month", "Tháng này"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                range === key
                  ? "bg-teal-800 text-teal-50"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data ? (
          <>
            <StatCard label="Booking" value={data.stats.bookingCount} />
            <StatCard label="Chuyến" value={data.stats.tripCount} />
            <StatCard
              label="Doanh thu"
              value={formatCurrency(data.stats.revenue)}
              hint="Theo giá đã báo"
            />
            <StatCard
              label="Chi phí"
              value={formatCurrency(data.stats.expense)}
              hint="Phase 2.3"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Booking cần xử lý</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/bookings?status=PENDING">Xem tất cả</Link>
            </Button>
          </div>
          <ul className="mt-4 space-y-3">
            {!data ? (
              <Skeleton className="h-24" />
            ) : data.pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có booking chờ.</p>
            ) : (
              data.pending.map((b) => (
                <li key={b.id} className="rounded-xl border border-border/70 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-semibold">
                        #{b.bookingCode}
                      </p>
                      <p className="mt-1 text-sm">
                        {b.pickup.address} → {b.destination.address}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {b.pickupDate} · {b.pickupTime} · {b.passengers} khách ·{" "}
                        {vehicleName(b.vehicleId)}
                      </p>
                    </div>
                    <BookingStatusBadge status={b.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-teal-800 hover:bg-teal-700"
                      disabled={confirmMut.isPending}
                      onClick={() => confirmMut.mutate(b.id)}
                    >
                      Xác nhận
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/bookings/${b.id}`}>Chi tiết</Link>
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold">Chuyến sắp chạy</h2>
          <ul className="mt-4 space-y-3">
            {!data ? (
              <Skeleton className="h-24" />
            ) : data.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có chuyến sắp tới.</p>
            ) : (
              data.upcoming.map((b) => (
                <li key={b.id} className="rounded-xl border border-border/70 p-3">
                  <p className="text-sm font-semibold">
                    {b.pickupTime} · {b.pickupDate}
                  </p>
                  <p className="mt-1 text-sm">
                    {b.pickup.address} → {b.destination.address}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Xe: {vehicleName(b.vehicleId)}
                    {b.driver ? ` · Tài xế: ${b.driver.name}` : ""}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <Link to={`/admin/bookings/${b.id}`}>Xem chuyến</Link>
                  </Button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {data ? (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="font-semibold">Xe</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <StatCard label="Tổng xe" value={data.vehicleStats.total} />
            <StatCard label="Đang hoạt động" value={data.vehicleStats.active} />
            <StatCard label="Đang chạy" value={data.vehicleStats.onTrip} />
            <StatCard label="Bảo dưỡng" value={data.vehicleStats.maintenance} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
