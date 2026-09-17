import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/features/auth/can";
import { PERMISSIONS } from "@/config/permissions";
import { vehicleAdminService } from "@/features/ride-admin/services/admin-api";
import {
  formToVehiclePayload,
  vehicleToForm,
  VehicleFormFields,
  VEHICLE_STATUS_LABEL,
  type VehicleFormState,
} from "@/features/ride-admin/pages/vehicle-form-fields";
import { SUITABLE_FOR_LABELS } from "@/features/ride/lib/labels";
import type { SuitableFor, Vehicle, VehicleStatus } from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { DEFAULT_VEHICLE_PRICING } from "@shared/ride/vehicle-pricing";

export function RideAdminVehicleDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [form, setForm] = useState<VehicleFormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVehicle(undefined);
    setEditing(false);
    setError(null);
    void vehicleAdminService
      .get(id)
      .then((v) => {
        if (!cancelled) {
          setVehicle(v);
          setForm(vehicleToForm(v));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setVehicle(null);
          setForm(null);
          setError(e instanceof ApiError ? e.message : "Không tìm thấy xe");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save() {
    if (!form) return;
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên xe");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await vehicleAdminService.update(
        id,
        formToVehiclePayload(form),
      );
      setVehicle(updated);
      setForm(vehicleToForm(updated));
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Xóa xe "${vehicle?.name}"? Hành động này không hoàn tác.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await vehicleAdminService.delete(id);
      navigate("/admin/vehicles", { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Xóa thất bại");
      setBusy(false);
    }
  }

  if (vehicle === undefined) return <Skeleton className="h-64 rounded-2xl" />;
  if (!vehicle || !form) {
    return (
      <div className="space-y-3">
        <p className="text-destructive">{error}</p>
        <Button asChild variant="outline">
          <Link to="/admin/vehicles">Quay lại</Link>
        </Button>
      </div>
    );
  }

  const status = (vehicle.status as VehicleStatus) || "AVAILABLE";
  const pricing = vehicle.pricing ?? DEFAULT_VEHICLE_PRICING;
  const image = vehicle.images[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/admin/vehicles">← Xe</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{vehicle.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicle.brand} {vehicle.model}
            {vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <Can permission={PERMISSIONS.FLEET_VEHICLE_UPDATE}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setForm(vehicleToForm(vehicle));
                  setEditing(true);
                  setError(null);
                }}
              >
                Sửa
              </Button>
            </Can>
          ) : null}
          <Can permission={PERMISSIONS.FLEET_VEHICLE_DELETE}>
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              <Trash2 className="size-3.5" />
              Xóa
            </Button>
          </Can>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {editing ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <VehicleFormFields form={form} onChange={setForm} />
          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              disabled={busy || !form.name.trim()}
              className="bg-teal-800 hover:bg-teal-700"
              onClick={() => void save()}
            >
              {busy ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setForm(vehicleToForm(vehicle));
                setEditing(false);
                setError(null);
              }}
            >
              Hủy
            </Button>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {image ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-muted">
              <img
                src={image}
                alt={vehicle.name}
                className="aspect-video w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
              Chưa có ảnh
            </div>
          )}

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Thông tin xe
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Hãng / Model" value={`${vehicle.brand} ${vehicle.model}`.trim() || "—"} />
              <Field label="Biển số" value={vehicle.licensePlate || "—"} />
              <Field label="Số chỗ" value={String(vehicle.seats)} />
              <Field label="Trạng thái" value={VEHICLE_STATUS_LABEL[status]} />
              <Field label="Hộp số" value={vehicle.transmission} />
              <Field label="Nhiên liệu" value={vehicle.fuel} />
              <Field label="Hoạt động" value={vehicle.active ? "Có" : "Không"} />
              <Field
                label="URL ảnh"
                value={image || "—"}
                className="sm:col-span-2 break-all"
              />
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Tiện nghi & phù hợp
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(vehicle.features ?? []).length > 0
                ? vehicle.features.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs"
                    >
                      {f}
                    </span>
                  ))
                : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(vehicle.suitableFor ?? []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-teal-800/10 px-2.5 py-1 text-xs text-teal-900 dark:text-teal-200"
                >
                  {SUITABLE_FOR_LABELS[tag as SuitableFor] ?? tag}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Cấu hình giá
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field
                label="Tiêu hao"
                value={`${pricing.fuelConsumptionPer100Km} L/100km`}
              />
              <Field
                label="Giá nhiên liệu"
                value={formatCurrency(pricing.fuelPricePerLiter)}
              />
              <Field
                label="Phí tài xế / giờ"
                value={formatCurrency(pricing.driverRate)}
              />
              <Field label="Cước cơ bản" value={formatCurrency(pricing.baseFare)} />
              <Field label="Giá / km" value={formatCurrency(pricing.pricePerKm)} />
              <Field
                label="Giá theo ngày"
                value={formatCurrency(pricing.dailyRate)}
              />
              <Field label="Km định mức / ngày" value={String(pricing.includedKm)} />
              <Field
                label="Giá km vượt"
                value={formatCurrency(pricing.extraKmRate)}
              />
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
