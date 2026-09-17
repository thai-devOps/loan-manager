import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/features/auth/can";
import { PERMISSIONS } from "@/config/permissions";
import { vehicleAdminService } from "@/features/ride-admin/services/admin-api";
import { VEHICLE_STATUS_LABEL } from "@/features/ride-admin/pages/vehicle-form-fields";
import type { Vehicle, VehicleStatus } from "@/features/ride/types/ride";
import { ApiError } from "@/api/client";

export function RideAdminVehiclesPage() {
  const [rows, setRows] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await vehicleAdminService.list());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải xe");
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(v: Vehicle) {
    if (!window.confirm(`Xóa xe "${v.name}"? Hành động này không hoàn tác.`)) {
      return;
    }
    setBusyId(v.id);
    setError(null);
    try {
      await vehicleAdminService.delete(v.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Xóa thất bại");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Xe phục vụ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý đội xe riêng có tài xế
          </p>
        </div>
        <Can permission={PERMISSIONS.FLEET_VEHICLE_CREATE}>
          <Button asChild className="bg-teal-800 hover:bg-teal-700">
            <Link to="/admin/vehicles/new">Thêm xe</Link>
          </Button>
        </Can>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))
          : rows.map((v) => {
              const status = (v.status as VehicleStatus) || "AVAILABLE";
              const image = v.images[0];
              return (
                <div
                  key={v.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                  ) : null}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{v.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {v.seats} chỗ · {v.licensePlate || "Chưa biển số"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                        {VEHICLE_STATUS_LABEL[status]}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/vehicles/${v.id}`}>Chi tiết</Link>
                      </Button>
                      <Can permission={PERMISSIONS.FLEET_VEHICLE_DELETE}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === v.id}
                          onClick={() => void remove(v)}
                        >
                          <Trash2 className="size-3.5" />
                          Xóa
                        </Button>
                      </Can>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
