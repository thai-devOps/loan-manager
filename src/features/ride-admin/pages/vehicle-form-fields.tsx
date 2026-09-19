import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/common/image-uploader";
import type { Vehicle, VehicleStatus } from "@/features/ride/types/ride";
import { DEFAULT_VEHICLE_PRICING } from "@shared/ride/vehicle-pricing";

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {
  AVAILABLE: "Sẵn sàng",
  ON_TRIP: "Đang chạy",
  MAINTENANCE: "Bảo dưỡng",
  INACTIVE: "Ngưng",
};

export type VehicleFormState = {
  name: string;
  brand: string;
  model: string;
  licensePlate: string;
  seats: string;
  transmission: string;
  fuel: string;
  status: VehicleStatus;
  active: boolean;
  imageUrl: string;
  imagePublicId: string;
  features: string;
  suitableFor: string;
  fuelConsumptionPer100Km: string;
  fuelPricePerLiter: string;
  driverRate: string;
  baseFare: string;
  pricePerKm: string;
  dailyRate: string;
  includedKm: string;
  extraKmRate: string;
};

export const emptyVehicleForm = (): VehicleFormState => ({
  name: "",
  brand: "",
  model: "",
  licensePlate: "",
  seats: "7",
  transmission: "Số tự động",
  fuel: "Xăng",
  status: "AVAILABLE",
  active: true,
  imageUrl: "",
  imagePublicId: "",
  features: "Xe riêng + tài xế",
  suitableFor: "travel",
  fuelConsumptionPer100Km: String(DEFAULT_VEHICLE_PRICING.fuelConsumptionPer100Km),
  fuelPricePerLiter: String(DEFAULT_VEHICLE_PRICING.fuelPricePerLiter),
  driverRate: String(DEFAULT_VEHICLE_PRICING.driverRate),
  baseFare: String(DEFAULT_VEHICLE_PRICING.baseFare),
  pricePerKm: String(DEFAULT_VEHICLE_PRICING.pricePerKm),
  dailyRate: String(DEFAULT_VEHICLE_PRICING.dailyRate),
  includedKm: String(DEFAULT_VEHICLE_PRICING.includedKm),
  extraKmRate: String(DEFAULT_VEHICLE_PRICING.extraKmRate),
});

export function vehicleToForm(v: Vehicle): VehicleFormState {
  const p = v.pricing ?? DEFAULT_VEHICLE_PRICING;
  return {
    name: v.name,
    brand: v.brand,
    model: v.model,
    licensePlate: v.licensePlate ?? "",
    seats: String(v.seats),
    transmission: v.transmission,
    fuel: v.fuel,
    status: (v.status as VehicleStatus) || "AVAILABLE",
    active: v.active,
    imageUrl: v.images[0] ?? "",
    imagePublicId: v.imagePublicIds?.[0] ?? "",
    features: (v.features ?? []).join(", "),
    suitableFor: (v.suitableFor ?? []).join(", "),
    fuelConsumptionPer100Km: String(p.fuelConsumptionPer100Km),
    fuelPricePerLiter: String(p.fuelPricePerLiter),
    driverRate: String(p.driverRate),
    baseFare: String(p.baseFare),
    pricePerKm: String(p.pricePerKm),
    dailyRate: String(p.dailyRate),
    includedKm: String(p.includedKm),
    extraKmRate: String(p.extraKmRate),
  };
}

export function formToVehiclePayload(form: VehicleFormState): Partial<Vehicle> {
  const imageUrl = form.imageUrl.trim();
  const imagePublicId = form.imagePublicId.trim();
  const features = form.features
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const suitableFor = form.suitableFor
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as Vehicle["suitableFor"];

  return {
    name: form.name.trim(),
    brand: form.brand.trim(),
    model: form.model.trim(),
    licensePlate: form.licensePlate.trim(),
    seats: Number(form.seats) || 4,
    transmission: form.transmission.trim(),
    fuel: form.fuel.trim(),
    status: form.status,
    active: form.active,
    images: imageUrl ? [imageUrl] : [],
    imagePublicIds: imagePublicId ? [imagePublicId] : [],
    features: features.length > 0 ? features : ["Xe riêng + tài xế"],
    suitableFor: suitableFor.length > 0 ? suitableFor : ["travel"],
    pricing: {
      fuelType: form.fuel.trim(),
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
}

export function VehicleFormFields({
  form,
  onChange,
}: {
  form: VehicleFormState;
  onChange: (next: VehicleFormState) => void;
}) {
  function set<K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor={`vehicle-${key}`}>{label}</Label>
          <Input
            id={`vehicle-${key}`}
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </div>
      ))}

      <div className="space-y-1.5">
        <Label>Trạng thái</Label>
        <Select
          value={form.status}
          onValueChange={(v) => set("status", v as VehicleStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(VEHICLE_STATUS_LABEL) as VehicleStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {VEHICLE_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label>Ảnh xe</Label>
        <ImageUploader
          folder="sitha-trip/rides"
          multiple={false}
          value={form.imageUrl}
          publicIds={form.imagePublicId}
          onChange={(next) =>
            set("imageUrl", typeof next === "string" ? next : (next[0] ?? ""))
          }
          onPublicIdsChange={(next) =>
            set(
              "imagePublicId",
              typeof next === "string" ? next : (next[0] ?? ""),
            )
          }
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="vehicle-features">Tiện nghi (cách nhau bởi dấu phẩy)</Label>
        <Input
          id="vehicle-features"
          value={form.features}
          onChange={(e) => set("features", e.target.value)}
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="vehicle-suitableFor">
          Phù hợp (travel, medical, airport, … — cách nhau bởi dấu phẩy)
        </Label>
        <Input
          id="vehicle-suitableFor"
          value={form.suitableFor}
          onChange={(e) => set("suitableFor", e.target.value)}
        />
      </div>

      <p className="sm:col-span-2 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
          <Label htmlFor={`vehicle-${key}`}>{label}</Label>
          <Input
            id={`vehicle-${key}`}
            inputMode="decimal"
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
