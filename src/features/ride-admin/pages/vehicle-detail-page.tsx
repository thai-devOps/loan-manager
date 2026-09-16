import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { vehicleAdminService } from "@/features/ride-admin/services/admin-api";
import type { Vehicle } from "@/features/ride/types/ride";
import { ApiError } from "@/api/client";

export function RideAdminVehicleDetailPage() {
  const { id = "" } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void vehicleAdminService
      .get(id)
      .then((v) => {
        if (!cancelled) setVehicle(v);
      })
      .catch((e) => {
        if (!cancelled) {
          setVehicle(null);
          setError(e instanceof ApiError ? e.message : "Không tìm thấy xe");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (vehicle === undefined) return <Skeleton className="h-64 rounded-2xl" />;
  if (!vehicle) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link to="/admin/vehicles">Quay lại</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/vehicles">← Xe</Link>
      </Button>
      <h1 className="text-2xl font-semibold">{vehicle.name}</h1>
      <dl className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Hãng / Model</dt>
          <dd className="font-medium">
            {vehicle.brand} {vehicle.model}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Biển số</dt>
          <dd className="font-medium">{vehicle.licensePlate || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Số chỗ</dt>
          <dd className="font-medium">{vehicle.seats}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Trạng thái</dt>
          <dd className="font-medium">{vehicle.status ?? "AVAILABLE"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Hộp số</dt>
          <dd className="font-medium">{vehicle.transmission}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Nhiên liệu</dt>
          <dd className="font-medium">{vehicle.fuel}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Hình thức: Xe riêng + tài xế (không tự lái)
      </p>
    </div>
  );
}
