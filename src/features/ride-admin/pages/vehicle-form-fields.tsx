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
import type {
  ConsumptionSource,
  PricingStrategy,
  VehicleFuelType,
  VehicleStatus,
} from "@/features/ride/types/ride";
import {
  CONSUMPTION_SOURCE_LABELS,
  CONSUMPTION_SOURCES,
  FUEL_TYPE_LABELS,
  PRICE_ROUNDING_UNITS,
  PRICING_STRATEGIES,
  PRICING_STRATEGY_LABELS,
  VEHICLE_FUEL_TYPES,
} from "@shared/ride/vehicle-pricing";
import {
  VEHICLE_STATUS_LABEL,
  type VehicleFormState,
} from "@/features/ride-admin/pages/vehicle-form-state";

export function VehicleFormFields({
  form,
  onChange,
}: {
  form: VehicleFormState;
  onChange: (next: VehicleFormState) => void;
}) {
  function set<K extends keyof VehicleFormState>(
    key: K,
    value: VehicleFormState[K],
  ) {
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
          ["fuel", "Nhãn nhiên liệu (hiển thị)"],
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
          onChange={(next, nextPublicIds) => {
            const imageUrl =
              typeof next === "string" ? next : (next[0] ?? "");
            const imagePublicId =
              nextPublicIds == null
                ? form.imagePublicId
                : typeof nextPublicIds === "string"
                  ? nextPublicIds
                  : (nextPublicIds[0] ?? "");
            onChange({ ...form, imageUrl, imagePublicId });
          }}
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
        Nhiên liệu
      </p>
      <p className="sm:col-span-2 -mt-2 text-xs text-muted-foreground">
        Giá xăng lấy từ PVOIL theo ngày chuyến (không nhập tay). Đơn vị tiêu hao:
        L/100km.
      </p>

      <div className="space-y-1.5">
        <Label>Loại nhiên liệu</Label>
        <Select
          value={form.fuelType || undefined}
          onValueChange={(v) => set("fuelType", v as VehicleFuelType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn loại PVOIL" />
          </SelectTrigger>
          <SelectContent>
            {VEHICLE_FUEL_TYPES.map((code) => (
              <SelectItem key={code} value={code}>
                {FUEL_TYPE_LABELS[code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Nguồn tiêu hao</Label>
        <Select
          value={form.consumptionSource || undefined}
          onValueChange={(v) => set("consumptionSource", v as ConsumptionSource)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn nguồn" />
          </SelectTrigger>
          <SelectContent>
            {CONSUMPTION_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {CONSUMPTION_SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(
        [
          ["consumptionCity", "Đô thị (L/100km)"],
          ["consumptionHighway", "Đường trường (L/100km)"],
          ["consumptionMixed", "Hỗn hợp (L/100km)"],
          ["defaultConsumption", "Mặc định (L/100km)"],
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

      <p className="sm:col-span-2 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Chi phí xe
      </p>
      <p className="sm:col-span-2 -mt-2 text-xs text-muted-foreground">
        Dùng cho Pricing Engine v2 (giá vốn). Không ảnh hưởng bảng giá công khai
        cũ.
      </p>

      {(
        [
          ["depreciationPerKm", "Khấu hao / km (đ)", "Chi phí hao mòn xe theo km vận hành"],
          [
            "operatingCostPerKm",
            "Vận hành / km (đ)",
            "Bảo dưỡng, lốp, dầu, bảo hiểm… gộp / km",
          ],
          [
            "waitingHourlyRate",
            "Phí chờ / giờ (đ)",
            "Khi khách yêu cầu chờ thêm ngoài thời gian lái",
          ],
        ] as const
      ).map(([key, label, tip]) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`vehicle-${key}`} title={tip}>
            {label}
          </Label>
          <Input
            id={`vehicle-${key}`}
            inputMode="decimal"
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </div>
      ))}

      <p className="sm:col-span-2 pt-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Giá bán
      </p>

      {(
        [
          ["baseFare", "Phí khởi hành / cước cơ bản (đ)"],
          ["pricePerKm", "Giá / km (đ)"],
          ["driverRate", "Phí tài xế / giờ (đ)"],
          ["dailyRate", "Giá theo ngày (đ)"],
          ["includedKm", "Km định mức / ngày"],
          ["extraKmRate", "Giá km vượt (đ)"],
          ["minimumTripPrice", "Giá tối thiểu chuyến (đ)"],
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

      <div className="space-y-1.5">
        <Label
          htmlFor="vehicle-targetMarginPercent"
          title="Margin trên giá bán, ví dụ 30 = 30%. Công thức: giá = vốn / (1 − margin)"
        >
          Target margin (%)
        </Label>
        <Input
          id="vehicle-targetMarginPercent"
          inputMode="decimal"
          value={form.targetMarginPercent}
          onChange={(e) => set("targetMarginPercent", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Làm tròn giá bán</Label>
        <Select
          value={form.priceRoundingUnit || undefined}
          onValueChange={(v) => set("priceRoundingUnit", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Đơn vị làm tròn" />
          </SelectTrigger>
          <SelectContent>
            {PRICE_ROUNDING_UNITS.map((u) => (
              <SelectItem key={u} value={String(u)}>
                {u.toLocaleString("vi-VN")} đ
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Chiến lược giá mặc định</Label>
        <Select
          value={form.pricingStrategy || undefined}
          onValueChange={(v) => set("pricingStrategy", v as PricingStrategy)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chiến lược" />
          </SelectTrigger>
          <SelectContent>
            {PRICING_STRATEGIES.map((s) => (
              <SelectItem key={s} value={s}>
                {PRICING_STRATEGY_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
