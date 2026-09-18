import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import type { PricingCalculateResult } from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";

async function calculatePublic(body: Record<string, unknown>) {
  const res = await fetch("/api/ride/pricing/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as PricingCalculateResult & {
    error?: string;
  };
  if (!res.ok) {
    throw new ApiError(data.error ?? "Không tính được giá", res.status);
  }
  return data;
}

export function RidePricingPage() {
  useRidePageMeta(
    "Bảng giá",
    "Ước tính giá chuyến xe có tài xế theo bảng giá hệ thống.",
  );

  const [origin, setOrigin] = useState("Long Xuyên");
  const [destination, setDestination] = useState("Cần Thơ");
  const [seats, setSeats] = useState("7");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [distanceKm, setDistanceKm] = useState("147.58");
  const [roundTrip, setRoundTrip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PricingCalculateResult | null>(null);

  async function onCalculate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const n = Number(seats) || 7;
      const vehicleCategory =
        n <= 4 ? "SEAT_4" : n <= 7 ? "SEAT_7" : "SEAT_16";
      const data = await calculatePublic({
        serviceType: "TRAVEL",
        vehicleCategory,
        origin,
        destination,
        distanceKm: Number(distanceKm) || 0,
        roundTrip,
        date,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tính được giá");
    } finally {
      setBusy(false);
    }
  }

  const bookingParams = new URLSearchParams({
    pickup: origin,
    destination,
    seats,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Bảng giá dịch vụ</h1>
      <p className="mt-2 text-muted-foreground">
        Ước tính giá theo bảng giá đang áp dụng. Giá dự kiến — giá cuối cùng có
        thể thay đổi theo lịch trình thực tế.
      </p>

      <div className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="space-y-1.5">
          <Label>Dịch vụ</Label>
          <Input value="Xe riêng có tài xế" disabled />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Điểm đón</Label>
            <Input value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Điểm đến</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Loại xe (số chỗ)</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            >
              <option value="4">4 chỗ</option>
              <option value="7">7 chỗ</option>
              <option value="16">16 chỗ+</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Ngày đi</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Khoảng cách ước tính (km)</Label>
            <Input
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={roundTrip}
                onChange={(e) => setRoundTrip(e.target.checked)}
              />
              Khứ hồi
            </label>
          </div>
        </div>

        <Button
          className="bg-teal-800 hover:bg-teal-700"
          disabled={busy}
          onClick={() => void onCalculate()}
        >
          {busy ? "Đang tính…" : "Tính giá"}
        </Button>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {result ? (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h2 className="font-semibold">Ước tính chuyến đi</h2>
            <p className="mt-1 text-sm">
              {origin} → {destination}
            </p>
            <p className="text-sm text-muted-foreground">
              {seats} chỗ · {result.billableKm.toLocaleString("vi-VN")} km
              {roundTrip ? " · Khứ hồi" : ""}
            </p>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Giá cơ bản</dt>
                <dd>{formatCurrency(result.breakdown.basePrice)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Theo quãng đường</dt>
                <dd>{formatCurrency(result.breakdown.distancePrice)}</dd>
              </div>
              {result.breakdown.surcharges > 0 ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Phụ phí</dt>
                  <dd>{formatCurrency(result.breakdown.surcharges)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-2 border-t border-border pt-2 text-base font-semibold">
                <dt>Tổng dự kiến</dt>
                <dd>{formatCurrency(result.breakdown.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Giá dự kiến — giá cuối cùng có thể thay đổi theo lịch trình thực
              tế.
            </p>
            <Button asChild className="mt-4 bg-teal-800 hover:bg-teal-700">
              <Link to={`/ride/booking?${bookingParams.toString()}`}>
                Đặt chuyến
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/ride/contact">Liên hệ tư vấn</Link>
        </Button>
      </div>
    </div>
  );
}
