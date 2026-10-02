import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddressSearchInput } from "@/features/ride/components/address-search-input";
import {
  pricingV2AdminService,
  type PricingV2QuoteResponse,
  vehicleAdminService,
} from "@/features/ride-admin/services/admin-api";
import type { Place } from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";

function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r} phút`;
  if (r === 0) return `${h} giờ`;
  return `${h} giờ ${r} phút`;
}

const TRIP_OPTIONS = [
  { value: "ONE_WAY", label: "Một chiều" },
  { value: "ROUND_TRIP", label: "Khứ hồi" },
  { value: "DAILY_RENTAL", label: "Thuê theo ngày" },
] as const;

export function RideAdminPricingCalculatorPage() {
  const vehiclesQ = useQuery({
    queryKey: ["ride-admin", "vehicles"],
    queryFn: () => vehicleAdminService.list(),
  });

  const [origin, setOrigin] = useState<Place>({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [destination, setDestination] = useState<Place>({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [tripType, setTripType] = useState<string>("ONE_WAY");
  const [travelDate, setTravelDate] = useState(todayIsoDate());
  const [vehicleId, setVehicleId] = useState("");
  const [waitingHours, setWaitingHours] = useState("0");
  const [tollName, setTollName] = useState("Phí cầu đường");
  const [tollAmount, setTollAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingV2QuoteResponse | null>(null);

  const vehicles = useMemo(
    () => (vehiclesQ.data ?? []).filter((v) => v.active !== false),
    [vehiclesQ.data],
  );

  async function calculate() {
    setError(null);
    setBusy(true);
    try {
      if (!vehicleId) {
        setError("Vui lòng chọn xe");
        return;
      }
      if (!origin.address.trim() || !destination.address.trim()) {
        setError("Vui lòng nhập điểm đón và điểm đến");
        return;
      }
      const tolls =
        Number(tollAmount) > 0
          ? [{ name: tollName.trim() || "Phí cầu đường", amount: Number(tollAmount) }]
          : [];
      const data = await pricingV2AdminService.quote({
        vehicleId,
        origin,
        destination,
        tripType,
        travelDate,
        waitingHours: Number(waitingHours) || 0,
        tolls,
      });
      setResult(data);
    } catch (e) {
      setResult(null);
      setError(e instanceof ApiError ? e.message : "Không tính được báo giá");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Báo giá chuyến</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pricing Engine v2 — giá vốn, giá đề xuất, lợi nhuận (ORS + PVOIL + cấu
          hình xe).
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="space-y-2">
          <Label>Điểm đón</Label>
          <AddressSearchInput value={origin} onChange={setOrigin} />
        </div>
        <div className="space-y-2">
          <Label>Điểm đến</Label>
          <AddressSearchInput value={destination} onChange={setDestination} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Loại chuyến</Label>
            <Select value={tripType} onValueChange={setTripType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIP_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="travel-date">Ngày chuyến</Label>
            <Input
              id="travel-date"
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Xe</Label>
          <Select value={vehicleId || undefined} onValueChange={setVehicleId}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn xe" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                  {v.licensePlate ? ` · ${v.licensePlate}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="wait-h">Giờ chờ</Label>
            <Input
              id="wait-h"
              inputMode="decimal"
              value={waitingHours}
              onChange={(e) => setWaitingHours(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor="toll-name">Tên phí cầu</Label>
            <Input
              id="toll-name"
              value={tollName}
              onChange={(e) => setTollName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toll-amt">Số tiền phí</Label>
            <Input
              id="toll-amt"
              inputMode="decimal"
              value={tollAmount}
              onChange={(e) => setTollAmount(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <Button
          type="button"
          className="w-full bg-teal-800 hover:bg-teal-700"
          disabled={busy}
          onClick={() => void calculate()}
        >
          {busy ? "Đang tính…" : "Tính báo giá"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      {result?.success && result.route && result.cost && result.pricing ? (
        <div className="space-y-4">
          <ResultPanel title="Lộ trình">
            <Row
              label="Quãng đường"
              value={`${Number(result.route.distanceKm).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} km`}
            />
            <Row
              label="Thời gian"
              value={formatDuration(result.route.durationMinutes)}
            />
            <Row label="Loại đường" value={routeTypeLabel(result.route.routeType)} />
          </ResultPanel>

          <ResultPanel title="Nhiên liệu">
            <Row
              label="PVOIL"
              value={
                result.fuel?.pricePerLiter != null
                  ? `${formatCurrency(result.fuel.pricePerLiter)}/L`
                  : "Thiếu giá"
              }
            />
            <Row
              label="Tiêu hao"
              value={
                result.fuel?.consumptionLPer100Km != null
                  ? `${result.fuel.consumptionLPer100Km} L/100km`
                  : "—"
              }
            />
            <Row
              label="Dự kiến"
              value={`${Number(result.fuel?.estimatedLiters ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} L`}
            />
            <Row
              label="Chi phí xăng"
              value={formatCurrency(result.fuel?.fuelCost ?? 0)}
            />
          </ResultPanel>

          <ResultPanel title="Giá vốn">
            <Row label="Nhiên liệu" value={formatCurrency(result.cost.fuel)} />
            <Row label="Tài xế" value={formatCurrency(result.cost.driver)} />
            <Row label="Phí chờ" value={formatCurrency(result.cost.waiting)} />
            <Row label="Cầu đường" value={formatCurrency(result.cost.toll)} />
            <Row
              label="Khấu hao"
              value={formatCurrency(result.cost.depreciation)}
            />
            <Row label="Vận hành" value={formatCurrency(result.cost.operating)} />
            <Row label="Khác" value={formatCurrency(result.cost.other)} />
            <Row
              label="Giá vốn"
              value={formatCurrency(result.cost.total)}
              strong
            />
          </ResultPanel>

          <ResultPanel title="Giá bán">
            <Row
              label="Giá theo bảng"
              value={formatCurrency(result.pricing.basePrice)}
            />
            <Row
              label="Giá tối thiểu theo margin"
              value={formatCurrency(result.pricing.costPlusPrice ?? 0)}
            />
            <Row
              label="Giá đề xuất"
              value={formatCurrency(result.pricing.finalPrice)}
              strong
            />
          </ResultPanel>

          <ResultPanel title="Lợi nhuận">
            <Row label="Lợi nhuận" value={formatCurrency(result.profit ?? 0)} />
            <Row
              label="Margin"
              value={`${Number(result.marginPercent ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`}
              strong
            />
          </ResultPanel>

          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>✓ Giá xăng lấy từ PVOIL</li>
            <li>✓ Route lấy từ ORS</li>
            <li>✓ Tiêu hao lấy từ cấu hình xe</li>
            <li>✓ Chi phí đã bao gồm khấu hao</li>
            <li>✓ Giá đề xuất đạt target margin (sau làm tròn)</li>
          </ul>

          {(result.warnings ?? []).length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-medium">Cảnh báo</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {result.warnings!.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function routeTypeLabel(t: string): string {
  if (t === "city") return "Đô thị";
  if (t === "highway") return "Đường trường";
  return "Đường hỗn hợp";
}

function ResultPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      <dl className="space-y-1.5 text-sm">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums text-right",
          strong && "font-semibold text-teal-900 dark:text-teal-100",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
