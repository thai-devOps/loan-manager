import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { vehicleAdminService } from "@/features/ride-admin/services/admin-api";
import type { Vehicle, VehicleStatus } from "@/features/ride/types/ride";
import { DEFAULT_VEHICLE_PRICING } from "@shared/ride/vehicle-pricing";
import { ApiError } from "@/api/client";

const STATUS_LABEL: Record<VehicleStatus, string> = {
  AVAILABLE: "Sẵn sàng",
  ON_TRIP: "Đang chạy",
  MAINTENANCE: "Bảo dưỡng",
  INACTIVE: "Ngưng",
};

const emptyForm = {
  name: "",
  brand: "",
  model: "",
  licensePlate: "",
  seats: "7",
  transmission: "Số tự động",
  fuel: "Xăng",
  status: "AVAILABLE" as VehicleStatus,
  active: true,
  fuelConsumptionPer100Km: String(DEFAULT_VEHICLE_PRICING.fuelConsumptionPer100Km),
  fuelPricePerLiter: String(DEFAULT_VEHICLE_PRICING.fuelPricePerLiter),
  driverRate: String(DEFAULT_VEHICLE_PRICING.driverRate),
  baseFare: String(DEFAULT_VEHICLE_PRICING.baseFare),
  pricePerKm: String(DEFAULT_VEHICLE_PRICING.pricePerKm),
  dailyRate: String(DEFAULT_VEHICLE_PRICING.dailyRate),
  includedKm: String(DEFAULT_VEHICLE_PRICING.includedKm),
  extraKmRate: String(DEFAULT_VEHICLE_PRICING.extraKmRate),
};

export function RideAdminVehiclesPage() {
  const [rows, setRows] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

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

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(v: Vehicle) {
    const p = v.pricing ?? DEFAULT_VEHICLE_PRICING;
    setEditing(v);
    setForm({
      name: v.name,
      brand: v.brand,
      model: v.model,
      licensePlate: v.licensePlate ?? "",
      seats: String(v.seats),
      transmission: v.transmission,
      fuel: v.fuel,
      status: (v.status as VehicleStatus) || "AVAILABLE",
      active: v.active,
      fuelConsumptionPer100Km: String(p.fuelConsumptionPer100Km),
      fuelPricePerLiter: String(p.fuelPricePerLiter),
      driverRate: String(p.driverRate),
      baseFare: String(p.baseFare),
      pricePerKm: String(p.pricePerKm),
      dailyRate: String(p.dailyRate),
      includedKm: String(p.includedKm),
      extraKmRate: String(p.extraKmRate),
    });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        brand: form.brand,
        model: form.model,
        licensePlate: form.licensePlate,
        seats: Number(form.seats) || 4,
        transmission: form.transmission,
        fuel: form.fuel,
        status: form.status,
        active: form.active,
        images: editing?.images ?? [],
        features: editing?.features ?? ["Xe riêng + tài xế"],
        suitableFor: editing?.suitableFor ?? ["travel"],
        pricing: {
          fuelType: form.fuel,
          fuelConsumptionPer100Km: Number(form.fuelConsumptionPer100Km) || 0,
          fuelPricePerLiter: Number(form.fuelPricePerLiter) || 0,
          driverRate: Number(form.driverRate) || 0,
          baseFare: Number(form.baseFare) || 0,
          pricePerKm: Number(form.pricePerKm) || 0,
          dailyRate: Number(form.dailyRate) || 0,
          includedKm: Number(form.includedKm) || 0,
          extraKmRate: Number(form.extraKmRate) || 0,
        },
      };
      if (editing) await vehicleAdminService.update(editing.id, payload);
      else await vehicleAdminService.create(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
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
        <Button className="bg-teal-800 hover:bg-teal-700" onClick={openCreate}>
          Thêm xe
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))
          : rows.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{v.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {v.seats} chỗ · {v.licensePlate || "Chưa biển số"}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {STATUS_LABEL[(v.status as VehicleStatus) || "AVAILABLE"]}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(v)}>
                    Sửa
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/admin/vehicles/${v.id}`}>Chi tiết</Link>
                  </Button>
                </div>
              </div>
            ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa xe" : "Thêm xe"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {(
              [
                ["name", "Tên xe"],
                ["brand", "Hãng"],
                ["model", "Model"],
                ["licensePlate", "Biển số"],
                ["seats", "Số chỗ"],
                ["transmission", "Hộp số"],
                ["fuel", "Nhiên liệu"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as VehicleStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as VehicleStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Cấu hình giá / nhiên liệu
            </p>
            {(
              [
                ["fuelConsumptionPer100Km", "Tiêu hao (L/100km)"],
                ["fuelPricePerLiter", "Giá nhiên liệu (đ/L)"],
                ["driverRate", "Phí tài xế / giờ"],
                ["baseFare", "Cước cơ bản"],
                ["pricePerKm", "Giá / km"],
                ["dailyRate", "Giá theo ngày"],
                ["includedKm", "Km định mức / ngày"],
                ["extraKmRate", "Giá km vượt"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <Button
              disabled={busy || !form.name.trim()}
              className="bg-teal-800 hover:bg-teal-700"
              onClick={() => void save()}
            >
              Lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
