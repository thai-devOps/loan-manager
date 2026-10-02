import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Car,
  Fuel,
  Gauge,
  Shield,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/features/auth/can";
import { PERMISSIONS } from "@/config/permissions";
import { ConfirmDeleteDialog } from "@/features/ride-admin/components/confirm-delete-dialog";
import { vehicleAdminService } from "@/features/ride-admin/services/admin-api";
import { VehicleFormFields } from "@/features/ride-admin/pages/vehicle-form-fields";
import {
  formToVehiclePayload,
  vehicleToForm,
  VEHICLE_STATUS_LABEL,
  type VehicleFormState,
} from "@/features/ride-admin/pages/vehicle-form-state";
import { SUITABLE_FOR_LABELS } from "@/features/ride/lib/labels";
import type { SuitableFor, Vehicle, VehicleStatus } from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { getCloudinaryImageUrl } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
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
  const [deleteOpen, setDeleteOpen] = useState(false);
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
      toast.success("Đã cập nhật xe");
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
      toast.success("Đã cập nhật vận hành xe");
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
    setBusy(true);
    setError(null);
    try {
      await vehicleAdminService.delete(id);
      toast.success("Đã xóa xe");
      setDeleteOpen(false);
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
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50 via-emerald-50/70 to-sky-50 dark:border-teal-900 dark:from-teal-950/50 dark:via-emerald-950/30 dark:to-sky-950/20">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2 text-teal-800 hover:bg-teal-100/70 hover:text-teal-900 dark:text-teal-200 dark:hover:bg-teal-900/40"
            >
              <Link to="/admin/vehicles">
                <ArrowLeft className="size-4" />
                Xe
              </Link>
            </Button>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-teal-950 dark:text-teal-50 sm:text-2xl">
                {vehicle.name}
              </h1>
              <span className="rounded-md bg-teal-800/10 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-400/15 dark:text-teal-100">
                {VEHICLE_STATUS_LABEL[status]}
              </span>
              {vehicle.licensePlate ? (
                <span className="font-mono text-xs font-medium text-teal-800/80 dark:text-teal-200/80">
                  {vehicle.licensePlate}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-teal-800/70 dark:text-teal-200/70">
              {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "—"}
              {vehicle.seats ? ` · ${vehicle.seats} chỗ` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {editing ? (
              <>
                <Button
                  size="sm"
                  disabled={busy || !form.name.trim()}
                  className="bg-teal-800 hover:bg-teal-700"
                  onClick={() => void save()}
                >
                  {busy ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-teal-200 bg-white/70 dark:border-teal-800 dark:bg-teal-950/40"
                  disabled={busy}
                  onClick={() => {
                    setForm(vehicleToForm(vehicle));
                    setEditing(false);
                    setError(null);
                  }}
                >
                  Hủy
                </Button>
              </>
            ) : (
              <Can permission={PERMISSIONS.FLEET_VEHICLE_UPDATE}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-teal-200 bg-white/70 dark:border-teal-800 dark:bg-teal-950/40"
                  onClick={() => {
                    setForm(vehicleToForm(vehicle));
                    setEditing(true);
                    setError(null);
                  }}
                >
                  Sửa
                </Button>
              </Can>
            )}
            <Can permission={PERMISSIONS.FLEET_VEHICLE_DELETE}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                disabled={busy}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Xóa
              </Button>
            </Can>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {editing ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-8 xl:col-span-9">
            <SectionHeader icon={Car} title="Thông tin & giá" />
            <div className="p-4 sm:p-5">
              <VehicleFormFields form={form} onChange={setForm} />
            </div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-4 xl:col-span-3">
            <SectionHeader icon={Gauge} title="Vận hành" />
            <div className="space-y-3 p-4 sm:p-5">
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
          </section>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-7 xl:col-span-8">
              <SectionHeader icon={Car} title="Thông tin xe" />
              {image ? (
                <div className="relative border-b border-border bg-muted">
                  <img
                    src={getCloudinaryImageUrl(image, { width: 1400 })}
                    alt={vehicle.name}
                    className="aspect-video w-full object-cover object-center"
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center border-b border-border bg-muted/40 text-sm text-muted-foreground">
                  Chưa có ảnh
                </div>
              )}
              <div className="space-y-4 p-4 sm:p-5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Field
                    label="Hãng / Model"
                    value={`${vehicle.brand} ${vehicle.model}`.trim() || "—"}
                    className="col-span-2 sm:col-span-1"
                  />
                  <Field label="Biển số" value={vehicle.licensePlate || "—"} />
                  <Field label="Số chỗ" value={String(vehicle.seats)} />
                  <Field label="Trạng thái" value={VEHICLE_STATUS_LABEL[status]} />
                  <Field label="Hộp số" value={vehicle.transmission || "—"} />
                  <Field label="Nhiên liệu" value={vehicle.fuel || "—"} />
                  <Field
                    label="Hoạt động"
                    value={vehicle.active ? "Có" : "Không"}
                  />
                </dl>
                <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Tiện nghi</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(vehicle.features ?? []).length > 0 ? (
                        vehicle.features.map((f) => (
                          <span
                            key={f}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs"
                          >
                            {f}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phù hợp</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(vehicle.suitableFor ?? []).length > 0 ? (
                        (vehicle.suitableFor ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-teal-800/10 px-2 py-0.5 text-xs text-teal-900 dark:text-teal-200"
                          >
                            {SUITABLE_FOR_LABELS[tag as SuitableFor] ?? tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-4 lg:col-span-5 xl:col-span-4">
              <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-teal-100 bg-teal-50/80 px-4 py-2.5 dark:border-teal-900/60 dark:bg-teal-950/40">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
                      <Gauge className="size-3.5" />
                    </span>
                    <h2 className="text-sm font-semibold text-teal-900 dark:text-teal-100">
                      Vận hành
                    </h2>
                  </div>
                  <Can permission={PERMISSIONS.FLEET_VEHICLE_UPDATE}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-teal-200 bg-white/70 dark:border-teal-800 dark:bg-teal-950/40"
                      disabled={busy}
                      onClick={() => void saveOps()}
                    >
                      Lưu
                    </Button>
                  </Can>
                </div>
                <div className="space-y-3 p-4">
                  <div className="space-y-1.5">
                    <Label>ODO hiện tại (km)</Label>
                    <Input
                      type="number"
                      value={ops.currentOdometer}
                      onChange={(e) =>
                        setOps((o) => ({
                          ...o,
                          currentOdometer: e.target.value,
                        }))
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
                  {vehicle.lastMaintenanceAt ? (
                    <p className="text-xs text-muted-foreground">
                      BD gần nhất: {vehicle.lastMaintenanceAt}
                      {vehicle.lastMaintenanceOdometer != null
                        ? ` · ${vehicle.lastMaintenanceOdometer.toLocaleString("vi-VN")} km`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <SectionHeader icon={Fuel} title="Cấu hình giá" />
                <dl className="grid gap-3 p-4 sm:grid-cols-2">
                  <Field
                    label="Loại nhiên liệu"
                    value={String(pricing.fuelType ?? "—")}
                  />
                  <Field
                    label="Tiêu hao (hỗn hợp)"
                    value={
                      pricing.fuelConsumption?.mixed != null
                        ? `${pricing.fuelConsumption.mixed} L/100km`
                        : pricing.defaultConsumption != null &&
                            pricing.defaultConsumption > 0
                          ? `${pricing.defaultConsumption} L/100km`
                          : pricing.fuelConsumptionPer100Km > 0
                            ? `${pricing.fuelConsumptionPer100Km} L/100km`
                            : "Chưa cấu hình"
                    }
                  />
                  <Field
                    label="Giá nhiên liệu"
                    value="Theo Petrolimex"
                  />
                  <Field
                    label="Phí tài xế / giờ"
                    value={formatCurrency(pricing.driverRate)}
                  />
                  <Field
                    label="Cước cơ bản"
                    value={formatCurrency(pricing.baseFare)}
                  />
                  <Field
                    label="Giá / km"
                    value={formatCurrency(pricing.pricePerKm)}
                  />
                  <Field
                    label="Giá theo ngày"
                    value={formatCurrency(pricing.dailyRate)}
                  />
                  <Field
                    label="Km định mức / ngày"
                    value={String(pricing.includedKm)}
                  />
                  <Field
                    label="Giá km vượt"
                    value={formatCurrency(pricing.extraKmRate)}
                    className="sm:col-span-2"
                  />
                </dl>
              </section>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-6">
              <SectionHeader icon={Wrench} title="Bảo dưỡng" />
              <div className="p-4">
                <ul className="space-y-2">
                  {logs.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      Chưa có lịch sử
                    </li>
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
                          {log.cost != null
                            ? ` · ${formatCurrency(log.cost)}`
                            : ""}
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
                        setMaintForm((f) => ({
                          ...f,
                          odometer: e.target.value,
                        }))
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
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-6">
              <SectionHeader icon={Shield} title="Bảo hiểm" />
              <div className="p-4">
                <ul className="space-y-2">
                  {insurances.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      Chưa có bảo hiểm
                    </li>
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
                        setInsForm((f) => ({
                          ...f,
                          startDate: e.target.value,
                        }))
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
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-12">
              <SectionHeader icon={Gauge} title="Lịch sử ODO" />
              <ul className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {odoHistory.length === 0 ? (
                  <li className="text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
                    Chưa có dữ liệu từ chuyến hoàn thành
                  </li>
                ) : (
                  odoHistory.map((e) => (
                    <li
                      key={e.tripId}
                      className="rounded-xl border border-border/70 px-3 py-2 text-sm"
                    >
                      <Link
                        to={`/admin/trips/${e.tripId}`}
                        className="font-mono font-medium underline-offset-2 hover:underline"
                      >
                        #{e.tripCode}
                      </Link>
                      <p className="mt-0.5 text-muted-foreground">
                        {e.pickupDate}{" "}
                        {e.startOdometer != null
                          ? e.startOdometer.toLocaleString("vi-VN")
                          : "—"}
                        {" → "}
                        {e.endOdometer != null
                          ? e.endOdometer.toLocaleString("vi-VN")
                          : "—"}{" "}
                        km
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        </>
      )}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !busy) setDeleteOpen(false);
        }}
        title="Xóa xe?"
        description={`Xóa xe «${vehicle.name}». Thao tác này không thể hoàn tác.`}
        pending={busy}
        onConfirm={() => {
          void remove();
        }}
      />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Car;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-teal-100 bg-teal-50/80 px-4 py-2.5 dark:border-teal-900/60 dark:bg-teal-950/40">
      <span className="flex size-7 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
        <Icon className="size-3.5" />
      </span>
      <h2 className="text-sm font-semibold text-teal-900 dark:text-teal-100">
        {title}
      </h2>
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
    <div className={cn(className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
