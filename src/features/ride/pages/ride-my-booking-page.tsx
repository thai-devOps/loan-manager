import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  tripLookupSchema,
  type TripLookupFormValues,
} from "@/features/ride/schemas/trip-booking.schema";
import {
  BOOKING_STATUS_FLOW,
  BOOKING_STATUS_LABELS,
  TRIP_TYPE_LABELS,
  canShowDriver,
} from "@/features/ride/lib/labels";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { tripService } from "@/features/ride/services/tripService";
import { vehicleService } from "@/features/ride/services/vehicleService";
import type { TripBooking, Vehicle } from "@/features/ride/types/ride";
import { cn } from "@/lib/utils";
import {
  hasHotline,
  hotlineTelHref,
} from "@/features/ride/config/ride-brand";

export function RideMyBookingPage() {
  useRidePageMeta(
    "Tra cứu chuyến",
    "Tra cứu yêu cầu đặt chuyến bằng mã chuyến và số điện thoại.",
  );

  const [searchParams] = useSearchParams();
  const [trip, setTrip] = useState<TripBooking | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<TripLookupFormValues>({
    resolver: zodResolver(tripLookupSchema),
    defaultValues: {
      bookingCode: searchParams.get("code") ?? "",
      phone: "",
    },
  });

  async function onSubmit(values: TripLookupFormValues) {
    setLoading(true);
    setNotFound(false);
    setTrip(null);
    setVehicle(null);
    try {
      const found = await tripService.lookupTrip({
        bookingCode: values.bookingCode,
        phone: values.phone,
      });
      if (!found) {
        setNotFound(true);
        return;
      }
      setTrip(found);
      const v = await vehicleService.getVehicleById(found.vehicleId);
      setVehicle(v);
    } finally {
      setLoading(false);
    }
  }

  const tel = hotlineTelHref();
  const showDriver = trip ? canShowDriver(trip.status) && trip.driver : false;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Tra cứu chuyến</h1>
      <p className="mt-2 text-muted-foreground">
        Nhập mã chuyến và số điện thoại đã dùng khi đặt.
      </p>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="bookingCode">Mã chuyến</Label>
          <Input
            id="bookingCode"
            placeholder="TRIP1025"
            {...form.register("bookingCode")}
          />
          {form.formState.errors.bookingCode ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.bookingCode.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="09xxxxxxxx"
            {...form.register("phone")}
          />
          {form.formState.errors.phone ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.phone.message}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-800 hover:bg-teal-700"
        >
          {loading ? "Đang tra cứu…" : "Tra cứu"}
        </Button>
      </form>

      {notFound ? (
        <p className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Không tìm thấy chuyến khớp mã và số điện thoại. Kiểm tra lại hoặc liên
          hệ hỗ trợ.
          {hasHotline() && tel ? (
            <>
              {" "}
              <a className="underline" href={tel}>
                Gọi hotline
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {trip ? (
        <div className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Mã chuyến
            </p>
            <p className="font-mono text-lg font-semibold">#{trip.bookingCode}</p>
            <p className="mt-2 text-sm">
              Trạng thái:{" "}
              <strong>{BOOKING_STATUS_LABELS[trip.status]}</strong>
            </p>
          </div>

          {/* Timeline */}
          {trip.status !== "CANCELLED" ? (
            <ol className="space-y-2">
              {BOOKING_STATUS_FLOW.map((status) => {
                const currentIdx = BOOKING_STATUS_FLOW.indexOf(
                  trip.status === "CANCELLED" ? "PENDING" : trip.status,
                );
                const idx = BOOKING_STATUS_FLOW.indexOf(status);
                const done = idx <= currentIdx;
                return (
                  <li
                    key={status}
                    className={cn(
                      "flex items-center gap-3 text-sm",
                      done ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        done ? "bg-teal-700" : "bg-border",
                      )}
                    />
                    {BOOKING_STATUS_LABELS[status]}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-destructive">Chuyến đã bị hủy.</p>
          )}

          <div className="space-y-1 text-sm">
            <p className="font-medium">{vehicle?.name ?? "Xe"} · Có tài xế</p>
            <p>
              {trip.pickup.address} → {trip.destination.address}
            </p>
            <p>
              {trip.pickupDate} · {trip.pickupTime}
            </p>
            <p>
              {trip.passengers} khách · {TRIP_TYPE_LABELS[trip.tripType]}
            </p>
            <p>
              Giá chuyến:{" "}
              {trip.quotedPrice == null
                ? "Đang xác nhận / Liên hệ báo giá"
                : `${trip.quotedPrice.toLocaleString("vi-VN")}đ`}
            </p>
          </div>

          {showDriver && trip.driver ? (
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <h2 className="font-semibold">Tài xế của bạn</h2>
              <p className="mt-2 text-sm">{trip.driver.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {vehicle?.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {trip.driver.vehiclePlate}
              </p>
              {trip.driver.phone ? (
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <a href={`tel:${trip.driver.phone.replace(/\D/g, "")}`}>
                    Gọi tài xế
                  </a>
                </Button>
              ) : null}
            </div>
          ) : trip.status === "PENDING" || trip.status === "CONFIRMED" ? (
            <p className="text-sm text-muted-foreground">
              Thông tin tài xế sẽ hiển thị sau khi chuyến được xác nhận và phân
              tài xế.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
