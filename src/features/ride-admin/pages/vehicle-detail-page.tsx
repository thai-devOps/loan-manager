import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type OdoEntry = {
  tripId: string;
  tripCode: string;
  pickupDate: string;
  pickupTime: string;
  startOdometer: number | null;
  endOdometer: number | null;
  status: string;
};

export function RideAdminVehicleDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [form, setForm] = useState<VehicleFormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [odoHistory, setOdoHistory] = useState<OdoEntry[]>([]);
  const [ops, setOps] = useState({
    currentOdometer: "",
    nextMaintenanceOdometer: "",
    registrationExpiry: "",
  });
  const [maintForm, setMaintForm] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    odometer: "",
    cost: "",
    garage: "",
    nextMaintenanceOdometer: "",
  });
  const [insForm, setInsForm] = useState({
    type: "Bảo hiểm trách nhiệm dân sự",
    provider: "",
    startDate: "",
    endDate: "",
    note: "",
  });

  async function load() {
    setVehicle(undefined);
    setEditing(false);
    setError(null);
    try {
      const [v, hist] = await Promise.all([
        vehicleAdminService.get(id),
        vehicleAdminService.odometerHistory(id).catch(() => null),
      ]);
      setVehicle(v);
      setForm(vehicleToForm(v));
      setOps({
        currentOdometer:
          v.currentOdometer != null ? String(v.currentOdometer) : "",
        nextMaintenanceOdometer:
          v.nextMaintenanceOdometer != null
            ? String(v.nextMaintenanceOdometer)
            : "",
        registrationExpiry: v.registrationExpiry ?? "",
      });
      setOdoHistory(hist?.entries ?? []);
      setMaintForm((f) => ({
        ...f,
        odometer:
          v.currentOdometer != null ? String(v.currentOdometer) : f.odometer,
      }));
    } catch (e) {
      setVehicle(null);
      setForm(null);
      setError(e instanceof ApiError ? e.message : "Không tìm thấy xe");
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const updated = await vehicleAdminService.update(id, {
        ...formToVehiclePayload(form),
        currentOdometer:
          ops.currentOdometer !== "" ? Number(ops.currentOdometer) : null,
        nextMaintenanceOdometer:
          ops.nextMaintenanceOdometer !== ""
            ? Number(ops.nextMaintenanceOdometer)
            : null,
        registrationExpiry: ops.registrationExpiry || null,
      });
      setVehicle(updated);
      setForm(vehicleToForm(updated));
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function saveOps() {
    if (!vehicle) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await vehicleAdminService.update(id, {
        ...vehicle,
        currentOdometer:
          ops.currentOdometer !== "" ? Number(ops.currentOdometer) : null,
        nextMaintenanceOdometer:
          ops.nextMaintenanceOdometer !== ""
            ? Number(ops.nextMaintenanceOdometer)
            : null,
        registrationExpiry: ops.registrationExpiry || null,
      });
      setVehicle(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function addMaintenance() {
    if (!maintForm.title.trim() || maintForm.odometer === "") {
      setError("Nhập nội dung và ODO bảo dưỡng");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await vehicleAdminService.action(id, {
        action: "addMaintenance",
        title: maintForm.title,
        date: maintForm.date,
        odometer: Number(maintForm.odometer),
        cost: maintForm.cost !== "" ? Number(maintForm.cost) : undefined,
        garage: maintForm.garage || undefined,
        nextMaintenanceOdometer:
          maintForm.nextMaintenanceOdometer !== ""
            ? Number(maintForm.nextMaintenanceOdometer)
            : undefined,
      });
      setVehicle(updated);
      setOps({
        currentOdometer:
          updated.currentOdometer != null
            ? String(updated.currentOdometer)
            : "",
        nextMaintenanceOdometer:
          updated.nextMaintenanceOdometer != null
            ? String(updated.nextMaintenanceOdometer)
            : "",
        registrationExpiry: updated.registrationExpiry ?? "",
      });
      setMaintForm({
        title: "",
        date: new Date().toISOString().slice(0, 10),
        odometer:
          updated.currentOdometer != null
            ? String(updated.currentOdometer)
            : "",
        cost: "",
        garage: "",
        nextMaintenanceOdometer: "",
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Thêm bảo dưỡng thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function addInsurance() {
    if (!insForm.type.trim()) {
      setError("Nhập loại bảo hiểm");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await vehicleAdminService.action(id, {
        action: "addInsurance",
        ...insForm,
      });
      setVehicle(updated);
      setInsForm({
        type: "Bảo hiểm trách nhiệm dân sự",
        provider: "",
        startDate: "",
        endDate: "",
        note: "",
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Thêm bảo hiểm thất bại");
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
  const logs = [...(vehicle.maintenanceLogs ?? [])].reverse();
  const insurances = [...(vehicle.insurances ?? [])].reverse();

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
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>ODO hiện tại</Label>
              <Input
                type="number"
                value={ops.currentOdometer}
                onChange={(e) =>
                  setOps((o) => ({ ...o, currentOdometer: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>ODO bảo dưỡng kế</Label>
              <Input
                type="number"
                value={ops.nextMaintenanceOdometer}
                onChange={(e) =>
                  setOps((o) => ({
                    ...o,
                    nextMaintenanceOdometer: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hạn đăng kiểm</Label>
              <Input
                type="date"
                value={ops.registrationExpiry}
                onChange={(e) =>
                  setOps((o) => ({
                    ...o,
                    registrationExpiry: e.target.value,
                  }))
                }
              />
            </div>
          </div>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Vận hành
              </h2>
              <Can permission={PERMISSIONS.FLEET_VEHICLE_UPDATE}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void saveOps()}
                >
                  Lưu ODO / ĐK
                </Button>
              </Can>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>ODO hiện tại (km)</Label>
                <Input
                  type="number"
                  value={ops.currentOdometer}
                  onChange={(e) =>
                    setOps((o) => ({ ...o, currentOdometer: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>ODO bảo dưỡng kế</Label>
                <Input
                  type="number"
                  value={ops.nextMaintenanceOdometer}
                  onChange={(e) =>
                    setOps((o) => ({
                      ...o,
                      nextMaintenanceOdometer: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hạn đăng kiểm</Label>
                <Input
                  type="date"
                  value={ops.registrationExpiry}
                  onChange={(e) =>
                    setOps((o) => ({
                      ...o,
                      registrationExpiry: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {vehicle.lastMaintenanceAt ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Bảo dưỡng gần nhất: {vehicle.lastMaintenanceAt}
                {vehicle.lastMaintenanceOdometer != null
                  ? ` · ${vehicle.lastMaintenanceOdometer.toLocaleString("vi-VN")} km`
                  : ""}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Bảo dưỡng
            </h2>
            <ul className="mt-3 space-y-2">
              {logs.length === 0 ? (
                <li className="text-sm text-muted-foreground">Chưa có lịch sử</li>
              ) : (
                logs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-xl border border-border/70 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
                      {log.date} · {log.title}
                    </p>
                    <p className="text-muted-foreground">
                      {log.odometer.toLocaleString("vi-VN")} km
                      {log.cost != null ? ` · ${formatCurrency(log.cost)}` : ""}
                      {log.garage ? ` · ${log.garage}` : ""}
                    </p>
                  </li>
                ))
              )}
            </ul>
            <Can permission={PERMISSIONS.FLEET_VEHICLE_UPDATE}>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Nội dung"
                  value={maintForm.title}
                  onChange={(e) =>
                    setMaintForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
                <Input
                  type="date"
                  value={maintForm.date}
                  onChange={(e) =>
                    setMaintForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
                <Input
                  type="number"
                  placeholder="ODO"
                  value={maintForm.odometer}
                  onChange={(e) =>
                    setMaintForm((f) => ({ ...f, odometer: e.target.value }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Chi phí"
                  value={maintForm.cost}
                  onChange={(e) =>
                    setMaintForm((f) => ({ ...f, cost: e.target.value }))
                  }
                />
                <Input
                  placeholder="Garage"
                  value={maintForm.garage}
                  onChange={(e) =>
                    setMaintForm((f) => ({ ...f, garage: e.target.value }))
                  }
                />
                <Input
                  type="number"
                  placeholder="ODO kỳ sau"
                  value={maintForm.nextMaintenanceOdometer}
                  onChange={(e) =>
                    setMaintForm((f) => ({
                      ...f,
                      nextMaintenanceOdometer: e.target.value,
                    }))
                  }
                />
              </div>
              <Button
                className="mt-3 bg-teal-800 hover:bg-teal-700"
                size="sm"
                disabled={busy}
                onClick={() => void addMaintenance()}
              >
                Thêm bảo dưỡng
              </Button>
            </Can>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Bảo hiểm
            </h2>
            <ul className="mt-3 space-y-2">
              {insurances.length === 0 ? (
                <li className="text-sm text-muted-foreground">Chưa có bảo hiểm</li>
              ) : (
                insurances.map((ins) => (
                  <li
                    key={ins.id}
                    className="rounded-xl border border-border/70 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{ins.type}</p>
                    <p className="text-muted-foreground">
                      {ins.provider ? `${ins.provider} · ` : ""}
                      {ins.startDate || "?"} → {ins.endDate || "?"}
                    </p>
                  </li>
                ))
              )}
            </ul>
            <Can permission={PERMISSIONS.FLEET_VEHICLE_UPDATE}>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Loại BH"
                  value={insForm.type}
                  onChange={(e) =>
                    setInsForm((f) => ({ ...f, type: e.target.value }))
                  }
                />
                <Input
                  placeholder="Nhà cung cấp"
                  value={insForm.provider}
                  onChange={(e) =>
                    setInsForm((f) => ({ ...f, provider: e.target.value }))
                  }
                />
                <Input
                  type="date"
                  value={insForm.startDate}
                  onChange={(e) =>
                    setInsForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
                <Input
                  type="date"
                  value={insForm.endDate}
                  onChange={(e) =>
                    setInsForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
              <Button
                className="mt-3 bg-teal-800 hover:bg-teal-700"
                size="sm"
                disabled={busy}
                onClick={() => void addInsurance()}
              >
                Thêm bảo hiểm
              </Button>
            </Can>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Lịch sử ODO
            </h2>
            <ul className="mt-3 space-y-2">
              {odoHistory.length === 0 ? (
                <li className="text-sm text-muted-foreground">
                  Chưa có dữ liệu từ chuyến hoàn thành
                </li>
              ) : (
                odoHistory.map((e) => (
                  <li key={e.tripId} className="text-sm">
                    <Link
                      to={`/admin/trips/${e.tripId}`}
                      className="font-mono font-medium underline-offset-2 hover:underline"
                    >
                      #{e.tripCode}
                    </Link>
                    <span className="text-muted-foreground">
                      {" "}
                      · {e.pickupDate}{" "}
                      {e.startOdometer != null
                        ? e.startOdometer.toLocaleString("vi-VN")
                        : "—"}
                      {" → "}
                      {e.endOdometer != null
                        ? e.endOdometer.toLocaleString("vi-VN")
                        : "—"}{" "}
                      km
                    </span>
                  </li>
                ))
              )}
            </ul>
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
