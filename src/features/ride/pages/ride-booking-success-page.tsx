import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  hasHotline,
  hasZalo,
  hotlineTelHref,
  rideBrand,
} from "@/features/ride/config/ride-brand";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { tripService } from "@/features/ride/services/tripService";
import { vehicleService } from "@/features/ride/services/vehicleService";
import type { TripBooking, Vehicle } from "@/features/ride/types/ride";

type LocationState = { trip?: TripBooking };

export function RideBookingSuccessPage() {
  useRidePageMeta("Đã gửi yêu cầu", "Yêu cầu đặt chuyến đã được tiếp nhận.");

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const stateTrip = (location.state as LocationState | null)?.trip;
  const codeParam = searchParams.get("code") ?? stateTrip?.bookingCode ?? "";

  const [trip, setTrip] = useState<TripBooking | null>(stateTrip ?? null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const found =
        stateTrip ??
        (codeParam ? await tripService.getTrip(codeParam) : null);
      if (cancelled) return;
      setTrip(found);
      if (found) {
        const v = await vehicleService.getVehicleById(found.vehicleId);
        if (!cancelled) setVehicle(v);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [codeParam, stateTrip]);

  const tel = hotlineTelHref();

  if (!trip) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">Không tìm thấy yêu cầu</h1>
        <p className="mt-2 text-muted-foreground">
          Mã chuyến không hợp lệ hoặc phiên đã hết. Bạn có thể tra cứu lại.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild className="bg-teal-800 hover:bg-teal-700">
            <Link to="/ride/my-booking">Tra cứu chuyến</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/ride/booking">Đặt chuyến mới</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Đã gửi yêu cầu
        </h1>
        <p className="mt-2 text-muted-foreground">
          Yêu cầu đặt chuyến của bạn đã được tiếp nhận.
        </p>

        <div className="mt-6 rounded-xl bg-muted/60 px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Mã chuyến
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-wide">
            #{trip.bookingCode}
          </p>
        </div>

        <div className="mt-6 space-y-2 text-left text-sm">
          <p className="font-medium">
            {vehicle?.name ?? "Xe đã chọn"} · Có tài xế
          </p>
          <p>
            {trip.pickup.address}
            <br />
            <span className="text-muted-foreground">→</span>{" "}
            {trip.destination.address}
          </p>
          <p>
            {trip.pickupDate} · {trip.pickupTime}
          </p>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Chúng tôi sẽ liên hệ để xác nhận chuyến và báo giá.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <Button asChild className="bg-teal-800 hover:bg-teal-700">
            <Link to={`/ride/my-booking?code=${trip.bookingCode}`}>
              Tra cứu chuyến
            </Link>
          </Button>
          {hasZalo() ? (
            <Button asChild variant="outline">
              <a href={rideBrand.zaloUrl} target="_blank" rel="noreferrer">
                Chat Zalo
              </a>
            </Button>
          ) : null}
          {hasHotline() && tel ? (
            <Button asChild variant="outline">
              <a href={tel}>Gọi ngay</a>
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <Link to="/ride">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
