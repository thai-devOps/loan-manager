import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/features/finance/components/money-input";
import { pricingRuleAdminService } from "@/features/ride-admin/services/admin-api";
import type {
  PricingCalculateResult,
  PricingRuleConfig,
  PricingRuleType,
  PricingServiceMatch,
  RidePricingRule,
  VehicleCategory,
} from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";

const TYPE_OPTIONS: { value: PricingRuleType; label: string }[] = [
  { value: "ROUTE", label: "Theo tuyến" },
  { value: "PER_KM", label: "Theo km" },
  { value: "PER_DAY", label: "Theo ngày" },
  { value: "AIRPORT", label: "Sân bay" },
  { value: "SURCHARGE", label: "Phụ phí" },
];

const SERVICE_OPTIONS: { value: PricingServiceMatch; label: string }[] = [
  { value: "ANY", label: "Tất cả dịch vụ" },
  { value: "TRAVEL", label: "Du lịch" },
  { value: "MEDICAL", label: "Y tế" },
  { value: "PILGRIMAGE", label: "Hành hương" },
  { value: "AIRPORT", label: "Sân bay" },
  { value: "BUSINESS", label: "Công tác" },
  { value: "CUSTOM", label: "Tùy chỉnh" },
];

const VEHICLE_OPTIONS: { value: VehicleCategory; label: string }[] = [
  { value: "ANY", label: "Tất cả loại xe" },
  { value: "SEAT_4", label: "4 chỗ" },
  { value: "SEAT_7", label: "7 chỗ" },
  { value: "SEAT_16", label: "16 chỗ+" },
];

type FormState = {
  name: string;
  type: PricingRuleType;
  serviceType: PricingServiceMatch;
  vehicleCategory: VehicleCategory;
  origin: string;
  destination: string;
  effectiveFrom: string;
  effectiveTo: string;
  priority: string;
  basePrice: number;
  pricePerKm: number;
  minimumPrice: number;
  pricePerDay: number;
  overtimePricePerHour: number;
  roundTrip: boolean;
  surchargeType: "fixed" | "percentage";
  surchargeAmount: number;
  surchargePercentage: number;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyForm(): FormState {
  return {
    name: "",
    type: "PER_KM",
    serviceType: "ANY",
    vehicleCategory: "ANY",
    origin: "",
    destination: "",
    effectiveFrom: todayIso(),
    effectiveTo: "",
    priority: "0",
    basePrice: 200_000,
    pricePerKm: 12_000,
    minimumPrice: 200_000,
    pricePerDay: 1_500_000,
    overtimePricePerHour: 150_000,
    roundTrip: false,
    surchargeType: "fixed",
    surchargeAmount: 0,
    surchargePercentage: 0,
  };
}

function ruleToForm(rule: RidePricingRule): FormState {
  const c = rule.pricingConfig || {};
  return {
    name: rule.name,
    type: rule.type,
    serviceType: rule.serviceType,
    vehicleCategory: rule.vehicleCategory,
    origin: rule.origin ?? "",
    destination: rule.destination ?? "",
    effectiveFrom: rule.effectiveFrom.slice(0, 10),
    effectiveTo: rule.effectiveTo ? rule.effectiveTo.slice(0, 10) : "",
    priority: String(rule.priority ?? 0),
    basePrice: c.basePrice ?? 0,
    pricePerKm: c.pricePerKm ?? 0,
    minimumPrice: c.minimumPrice ?? 0,
    pricePerDay: c.pricePerDay ?? 0,
    overtimePricePerHour: c.overtimePricePerHour ?? 0,
    roundTrip: c.roundTrip === true,
    surchargeType: c.surchargeType === "percentage" ? "percentage" : "fixed",
    surchargeAmount: c.surchargeAmount ?? 0,
    surchargePercentage: c.surchargePercentage ?? 0,
  };
}

function formToConfig(form: FormState): PricingRuleConfig {
  if (form.type === "PER_DAY") {
    return {
      pricePerDay: form.pricePerDay,
      overtimePricePerHour: form.overtimePricePerHour,
    };
  }
  if (form.type === "SURCHARGE") {
    return {
      surchargeType: form.surchargeType,
      surchargeAmount: form.surchargeAmount,
      surchargePercentage: form.surchargePercentage,
    };
  }
  return {
    basePrice: form.basePrice,
    pricePerKm: form.pricePerKm,
    minimumPrice: form.minimumPrice || undefined,
    roundTrip: form.roundTrip,
  };
}

export function PricingRuleFormDialog({
  open,
  onOpenChange,
  rule,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RidePricingRule | null;
  onSaved: (rule: RidePricingRule) => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PricingCalculateResult | null>(null);
  const [previewKm, setPreviewKm] = useState("147.58");

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setError(null);
      setPreview(null);
      setForm(rule ? ruleToForm(rule) : emptyForm());
    });
  }, [open, rule]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        type: form.type,
        serviceType: form.serviceType,
        vehicleCategory: form.vehicleCategory,
        origin: form.origin || undefined,
        destination: form.destination || undefined,
        pricingConfig: formToConfig(form),
        priority: Number(form.priority) || 0,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
      };
      const saved = rule
        ? await pricingRuleAdminService.update(rule.id, body)
        : await pricingRuleAdminService.create(body);
      onSaved(saved);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function runPreview() {
    setError(null);
    try {
      // Preview uses draft form values via temporary calculate with distance only
      // against published rules — for form UX we compute locally-style via API
      // using current origin/destination keys and distance.
      const result = await pricingRuleAdminService.calculate({
        serviceType: form.serviceType === "ANY" ? "TRAVEL" : form.serviceType,
        vehicleCategory: form.vehicleCategory,
        origin: form.origin || "Long Xuyên",
        destination: form.destination || "Cần Thơ",
        distanceKm: Number(previewKm) || 0,
        roundTrip: form.roundTrip,
        date: form.effectiveFrom || todayIso(),
      });
      setPreview(result);
    } catch (e) {
      setPreview(null);
      setError(e instanceof ApiError ? e.message : "Không xem trước được");
    }
  }

  const showRoute = form.type === "ROUTE" || form.type === "AIRPORT";
  const showKm = form.type === "ROUTE" || form.type === "PER_KM" || form.type === "AIRPORT";
  const showDay = form.type === "PER_DAY";
  const showSurcharge = form.type === "SURCHARGE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {rule ? "Sửa bảng giá" : "Thêm bảng giá"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tên bảng giá</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Long Xuyên → Cần Thơ · 7 chỗ"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Loại</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as PricingRuleType,
                  }))
                }
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Loại dịch vụ</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.serviceType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    serviceType: e.target.value as PricingServiceMatch,
                  }))
                }
              >
                {SERVICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Loại xe</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.vehicleCategory}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    vehicleCategory: e.target.value as VehicleCategory,
                  }))
                }
              >
                {VEHICLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Độ ưu tiên</Label>
              <Input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value }))
                }
              />
            </div>
          </div>

          {showRoute ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Điểm đón</Label>
                <Input
                  value={form.origin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, origin: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Điểm đến</Label>
                <Input
                  value={form.destination}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, destination: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Áp dụng từ</Label>
              <Input
                type="date"
                value={form.effectiveFrom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effectiveFrom: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Áp dụng đến</Label>
              <Input
                type="date"
                value={form.effectiveTo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effectiveTo: e.target.value }))
                }
              />
            </div>
          </div>

          {showKm ? (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <p className="text-sm font-medium">Công thức giá</p>
              <div className="space-y-1.5">
                <Label>Giá cơ bản</Label>
                <MoneyInput
                  value={form.basePrice}
                  onChange={(n) => setForm((f) => ({ ...f, basePrice: n }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Giá/km</Label>
                <MoneyInput
                  value={form.pricePerKm}
                  onChange={(n) => setForm((f) => ({ ...f, pricePerKm: n }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Giá tối thiểu</Label>
                <MoneyInput
                  value={form.minimumPrice}
                  onChange={(n) =>
                    setForm((f) => ({ ...f, minimumPrice: n }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.roundTrip}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, roundTrip: e.target.checked }))
                  }
                />
                Khứ hồi
              </label>
            </div>
          ) : null}

          {showDay ? (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <div className="space-y-1.5">
                <Label>Giá/ngày</Label>
                <MoneyInput
                  value={form.pricePerDay}
                  onChange={(n) => setForm((f) => ({ ...f, pricePerDay: n }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Giá giờ vượt</Label>
                <MoneyInput
                  value={form.overtimePricePerHour}
                  onChange={(n) =>
                    setForm((f) => ({ ...f, overtimePricePerHour: n }))
                  }
                />
              </div>
            </div>
          ) : null}

          {showSurcharge ? (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <div className="space-y-1.5">
                <Label>Kiểu phụ phí</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.surchargeType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      surchargeType: e.target.value as "fixed" | "percentage",
                    }))
                  }
                >
                  <option value="fixed">Số tiền cố định</option>
                  <option value="percentage">Phần trăm</option>
                </select>
              </div>
              {form.surchargeType === "percentage" ? (
                <div className="space-y-1.5">
                  <Label>Phần trăm (%)</Label>
                  <Input
                    type="number"
                    value={form.surchargePercentage}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        surchargePercentage: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Số tiền</Label>
                  <MoneyInput
                    value={form.surchargeAmount}
                    onChange={(n) =>
                      setForm((f) => ({ ...f, surchargeAmount: n }))
                    }
                  />
                </div>
              )}
            </div>
          ) : null}

          {!showSurcharge ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Xem trước</p>
                  <p className="text-xs text-muted-foreground">
                    Tính thử theo bảng giá đang ACTIVE (đã publish)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    value={previewKm}
                    onChange={(e) => setPreviewKm(e.target.value)}
                    aria-label="Km xem trước"
                  />
                  <span className="text-xs text-muted-foreground">km</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => void runPreview()}>
                    Tính thử
                  </Button>
                </div>
              </div>
              {preview ? (
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Giá cơ bản</dt>
                    <dd>{formatCurrency(preview.breakdown.basePrice)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Theo quãng đường</dt>
                    <dd>{formatCurrency(preview.breakdown.distancePrice)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Phụ phí</dt>
                    <dd>{formatCurrency(preview.breakdown.surcharges)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-border pt-1 font-semibold">
                    <dt>Tổng</dt>
                    <dd>{formatCurrency(preview.breakdown.total)}</dd>
                  </div>
                  <p className="pt-1 text-xs text-muted-foreground">
                    Rule #{preview.matchedRuleId.slice(0, 8)} · v{preview.version}
                  </p>
                </dl>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            className="bg-teal-800 hover:bg-teal-700"
            disabled={busy || !form.name.trim()}
            onClick={() => void save()}
          >
            {busy ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
