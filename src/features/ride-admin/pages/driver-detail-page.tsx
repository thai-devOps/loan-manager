import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { driverAdminService } from "@/features/ride-admin/services/admin-api";
import type { Driver } from "@/features/ride/types/ride";
import { ApiError } from "@/api/client";

export function RideAdminDriverDetailPage() {
  const { id = "" } = useParams();
  const [driver, setDriver] = useState<Driver | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void driverAdminService
      .get(id)
      .then((d) => {
        if (!cancelled) setDriver(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setDriver(null);
          setError(e instanceof ApiError ? e.message : "Không tìm thấy tài xế");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (driver === undefined) return <Skeleton className="h-48 rounded-2xl" />;
  if (!driver) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link to="/admin/drivers">Quay lại</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/drivers">← Tài xế</Link>
      </Button>
      <h1 className="text-2xl font-semibold">{driver.name}</h1>
      <dl className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Điện thoại</dt>
          <dd className="font-medium">{driver.phone}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bằng lái</dt>
          <dd className="font-medium">{driver.licenseType || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Hết hạn</dt>
          <dd className="font-medium">{driver.licenseExpiry || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd className="font-medium">{driver.status}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Kích hoạt</dt>
          <dd className="font-medium">{driver.active ? "Có" : "Không"}</dd>
        </div>
      </dl>
    </div>
  );
}
