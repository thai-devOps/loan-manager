import { useEffect, useState } from "react";
import { VehicleCard } from "@/features/ride/components/vehicle-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { vehicleService } from "@/features/ride/services/vehicleService";
import type { Vehicle } from "@/features/ride/types/ride";

export function RideCarsPage() {
  useRidePageMeta(
    "Xe phục vụ",
    "Các dòng xe riêng có tài xế — 4, 5, 7 và 16 chỗ.",
  );

  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void vehicleService
      .getVehicles()
      .then((list) => {
        if (!cancelled) setVehicles(list);
      })
      .catch(() => {
        if (!cancelled) setError("Không tải được danh sách xe. Vui lòng thử lại.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Các dòng xe phục vụ
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Xe riêng + tài xế. Không có dịch vụ tự lái.
      </p>

      {error ? (
        <p className="mt-8 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[22rem] rounded-2xl" />
            ))
          : vehicles.length === 0
            ? (
              <p className="text-muted-foreground sm:col-span-2 lg:col-span-3">
                Hiện chưa có xe đang phục vụ.
              </p>
            )
            : vehicles.map((v, i) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  animationDelayMs={i * 70}
                />
              ))}
      </div>
    </div>
  );
}
