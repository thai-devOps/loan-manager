import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { EditIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/features/auth/can";
import { BookingStatusBadge } from "@/features/ride-admin/components/booking-status-badge";
import { CustomerStatusBadge } from "@/features/ride-admin/components/customer-status-badge";
import { TripStatusBadge } from "@/features/ride-admin/components/trip-status-badge";
import { CustomerFormDialog } from "@/features/ride-admin/pages/customer-form-dialog";
import { customerAdminService } from "@/features/ride-admin/services/admin-api";
import { TRIP_TYPE_LABELS } from "@/features/ride/lib/labels";
import type { RideCustomerDetail } from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { PERMISSIONS } from "@/config/permissions";

function isDetail(
  value: unknown,
): value is RideCustomerDetail {
  return Boolean(value && typeof value === "object" && "stats" in value);
}

export function RideAdminCustomerDetailPage() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<RideCustomerDetail | null | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    setError(null);
    try {
      const data = await customerAdminService.get(id, true);
      if (!isDetail(data)) {
        setDetail(null);
        setError("Dữ liệu khách hàng không hợp lệ");
        return;
      }
      setDetail(data);
    } catch (e) {
      setDetail(null);
      setError(e instanceof ApiError ? e.message : "Không tải khách hàng");
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runAction(action: "deactivate" | "activate") {
    setBusy(true);
    setError(null);
    try {
      await customerAdminService.action(id, { action });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Thao tác thất bại");
    } finally {
      setBusy(false);
    }
  }

  if (detail === undefined) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (!detail) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{error ?? "Không tìm thấy"}</p>
        <Button asChild variant="outline">
          <Link to="/admin/customers">Quay lại</Link>
        </Button>
      </div>
    );
  }

  const lastTrip = detail.recentTrips[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/admin/customers">← Khách hàng</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CustomerStatusBadge status={detail.status} />
            <span className="font-mono text-xs text-muted-foreground">
              {detail.customerCode}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Can permission={PERMISSIONS.FLEET_CUSTOMER_UPDATE}>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <EditIcon size={14} />
              Sửa
            </Button>
          </Can>
          {detail.status === "ACTIVE" ? (
            <Can permission={PERMISSIONS.FLEET_CUSTOMER_DELETE}>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => void runAction("deactivate")}
              >
                <Trash2 className="size-3.5" />
                Ngưng hoạt động
              </Button>
            </Can>
          ) : (
            <Can permission={PERMISSIONS.FLEET_CUSTOMER_UPDATE}>
              <Button
                size="sm"
                className="bg-teal-800 hover:bg-teal-700"
                disabled={busy}
                onClick={() => void runAction("activate")}
              >
                Kích hoạt lại
              </Button>
            </Can>
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Thông tin khách
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">SĐT</dt>
            <dd className="font-medium">{detail.phone}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{detail.email || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Địa chỉ</dt>
            <dd className="font-medium">{detail.address || "—"}</dd>
          </div>
          {detail.note ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Ghi chú</dt>
              <dd className="font-medium whitespace-pre-wrap">{detail.note}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tổng chuyến", value: String(detail.stats.tripCount) },
          {
            label: "Hoàn thành",
            value: String(detail.stats.completedTrips),
          },
          {
            label: "Doanh thu",
            value: formatCurrency(detail.stats.totalRevenue),
          },
          {
            label: "Booking",
            value: String(detail.stats.bookingCount),
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{s.value}</p>
          </div>
        ))}
      </section>

      {lastTrip ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Chuyến gần nhất
          </h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-sm font-semibold">{lastTrip.tripCode}</p>
              <p className="text-sm text-muted-foreground">
                {lastTrip.pickupDate} · {lastTrip.pickupTime} ·{" "}
                {TRIP_TYPE_LABELS[lastTrip.tripType] ?? lastTrip.tripType}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TripStatusBadge status={lastTrip.status} />
              <Button asChild size="sm" variant="outline">
                <Link to={`/admin/trips/${lastTrip.id}`}>Xem</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Lịch sử chuyến
        </h2>
        <div className="mt-3 space-y-2">
          {detail.recentTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có chuyến.</p>
          ) : (
            detail.recentTrips.map((t) => (
              <Link
                key={t.id}
                to={`/admin/trips/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold">{t.tripCode}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {t.pickupDate} · {t.pickup?.address ?? "—"}
                  </p>
                </div>
                <TripStatusBadge status={t.status} />
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Lịch sử booking
        </h2>
        <div className="mt-3 space-y-2">
          {detail.recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có booking.</p>
          ) : (
            detail.recentBookings.map((b) => (
              <Link
                key={b.id}
                to={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold">
                    #{b.bookingCode}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {b.pickupDate} · {b.pickup?.address ?? "—"}
                  </p>
                </div>
                <BookingStatusBadge status={b.status} />
              </Link>
            ))
          )}
        </div>
      </section>

      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={detail}
        onSaved={() => {
          setEditOpen(false);
          void load();
        }}
      />
    </div>
  );
}
