import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SUITABLE_FOR_LABELS } from "@/features/ride/lib/labels";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { vehicleService } from "@/features/ride/services/vehicleService";
import type { Vehicle } from "@/features/ride/types/ride";
import { getCloudinaryImageUrl } from "@/lib/cloudinary";

export function RideCarDetailPage() {
  const { id = "" } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void vehicleService.getVehicleById(id).then((v) => {
      if (!cancelled) setVehicle(v);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useRidePageMeta(
    vehicle?.name ?? "Chi tiết xe",
    vehicle
      ? `${vehicle.name} — ${vehicle.seats} chỗ, xe riêng có tài xế.`
      : undefined,
  );

  if (vehicle === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  if (vehicle === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">Không tìm thấy xe</h1>
        <p className="mt-2 text-muted-foreground">
          Xe có thể đã ngừng phục vụ hoặc mã không hợp lệ.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/ride/cars">Quay lại danh sách xe</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          {vehicle.images.map((src, i) => (
            <div
              key={src}
              className="overflow-hidden rounded-2xl border border-border bg-muted"
            >
              <img
                src={getCloudinaryImageUrl(src, { width: 1200 })}
                alt={`${vehicle.name} — ảnh ${i + 1}`}
                className="aspect-video w-full object-cover"
              />
            </div>
          ))}
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {vehicle.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {vehicle.brand} · {vehicle.model}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-border bg-card px-3 py-2">
              <dt className="text-muted-foreground">Số chỗ</dt>
              <dd className="font-medium">{vehicle.seats} chỗ</dd>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2">
              <dt className="text-muted-foreground">Hộp số</dt>
              <dd className="font-medium">{vehicle.transmission}</dd>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2">
              <dt className="text-muted-foreground">Nhiên liệu</dt>
              <dd className="font-medium">{vehicle.fuel}</dd>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2">
              <dt className="text-muted-foreground">Hình thức</dt>
              <dd className="font-medium">Xe riêng</dd>
            </div>
          </dl>

          <div className="mt-8">
            <h2 className="font-semibold">Phù hợp cho</h2>
            <ul className="mt-3 space-y-2">
              {vehicle.suitableFor.map((tag) => (
                <li key={tag} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-teal-700" aria-hidden />
                  {SUITABLE_FOR_LABELS[tag]}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <h2 className="font-semibold">Tài xế</h2>
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Check className="size-4 text-teal-700" aria-hidden />
              Có tài xế riêng
            </p>
          </div>

          {vehicle.features.length > 0 ? (
            <div className="mt-8">
              <h2 className="font-semibold">Tiện nghi</h2>
              <ul className="mt-3 space-y-2">
                {vehicle.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-teal-700" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button
            asChild
            size="lg"
            className="mt-10 min-h-11 w-full bg-teal-800 hover:bg-teal-700 sm:w-auto"
          >
            <Link to={`/ride/booking?vehicleId=${vehicle.id}`}>
              Đặt chuyến với xe này
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
