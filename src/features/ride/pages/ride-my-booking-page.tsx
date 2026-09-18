import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Phone } from "lucide-react";
import {
  tripLookupSchema,
  type TripLookupFormValues,
} from "@/features/ride/schemas/trip-booking.schema";
import { TrackingHero } from "@/features/ride/components/tracking/tracking-hero";
import { TrackingSearchForm } from "@/features/ride/components/tracking/tracking-search-form";
import { TrackingResult } from "@/features/ride/components/tracking/tracking-result";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { tripService } from "@/features/ride/services/tripService";
import { vehicleService } from "@/features/ride/services/vehicleService";
import type { TripBooking, Vehicle } from "@/features/ride/types/ride";
import { cn } from "@/lib/utils";
import { hasHotline, hotlineTelHref } from "@/features/ride/config/ride-brand";

export function RideMyBookingPage() {
  useRidePageMeta(
    "Tra cứu chuyến",
    "Tra cứu yêu cầu đặt chuyến bằng mã chuyến và số điện thoại.",
    { noindex: true },
  );

  const [searchParams] = useSearchParams();
  const [trip, setTrip] = useState<TripBooking | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const form = useForm<TripLookupFormValues>({
    resolver: zodResolver(tripLookupSchema),
    defaultValues: {
      bookingCode: searchParams.get("code") ?? "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!trip) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const id = window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [trip]);

  async function onSubmit(values: TripLookupFormValues) {
    setLoading(true);
    setNotFound(false);
    setTrip(null);
    setVehicle(null);
    setHasSearched(true);
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

  return (
    <div className="pb-10 sm:pb-14">
      <TrackingHero />

      <div className="relative mx-auto max-w-lg px-4 sm:px-6">
        <TrackingSearchForm form={form} loading={loading} onSubmit={onSubmit} />

        {!hasSearched && !trip ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Mã chuyến được gửi sau khi bạn đặt thành công (SMS hoặc trang xác
            nhận).
          </p>
        ) : null}

        {notFound ? (
          <div
            className={cn(
              "mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground sm:p-5",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-400",
            )}
            role="alert"
          >
            <p>
              Không tìm thấy chuyến khớp mã và số điện thoại. Kiểm tra lại hoặc
              liên hệ hỗ trợ.
            </p>
            {hasHotline() && tel ? (
              <a
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                href={tel}
              >
                <Phone className="size-3.5" aria-hidden />
                Gọi hotline
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {trip ? (
        <div
          ref={resultRef}
          className="mx-auto mt-8 w-[calc(100%-2rem)] max-w-280 scroll-mt-20 sm:mt-10"
        >
          <TrackingResult trip={trip} vehicle={vehicle} />
        </div>
      ) : null}
    </div>
  );
}
