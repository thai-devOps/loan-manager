import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressSearchInput } from "@/features/ride/components/address-search-input";
import { VehicleCard } from "@/features/ride/components/vehicle-card";
import {
  tripBookingFormSchema,
  type TripBookingFormValues,
} from "@/features/ride/schemas/trip-booking.schema";
import {
  getBookingClientId,
  newIdempotencyKey,
} from "@/features/ride/lib/booking-client-id";
import {
  SERVICE_TYPE_LABELS,
  TRIP_TYPE_LABELS,
} from "@/features/ride/lib/labels";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { tripService } from "@/features/ride/services/tripService";
import { vehicleService } from "@/features/ride/services/vehicleService";
import {
  trackRideEvent,
} from "@/features/ride/lib/ride-analytics";
import type {
  Place,
  ServiceType,
  TripType,
  Vehicle,
} from "@/features/ride/types/ride";
import { cn } from "@/lib/utils";

const SERVICE_OPTIONS = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[];
const TRIP_OPTIONS: TripType[] = ["ONE_WAY", "ROUND_TRIP", "DAILY", "CUSTOM"];

function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseServiceType(raw: string | null): ServiceType {
  if (raw && raw in SERVICE_TYPE_LABELS) return raw as ServiceType;
  return "TRAVEL";
}

function parseTripType(raw: string | null): TripType {
  if (raw && raw in TRIP_TYPE_LABELS) return raw as TripType;
  return "ONE_WAY";
}

export function RideBookingPage() {
  useRidePageMeta("Đặt chuyến", "Gửi yêu cầu đặt chuyến xe riêng có tài xế.", {
    noindex: true,
  });

  useEffect(() => {
    trackRideEvent("booking_started");
  }, []);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [suitable, setSuitable] = useState<Vehicle[] | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKeyRef = useRef(newIdempotencyKey());
  const honeypotRef = useRef<HTMLInputElement | null>(null);
  const [pickupPlace, setPickupPlace] = useState<Place>({
    address: searchParams.get("pickup") ?? "",
    latitude: Number(searchParams.get("pickupLat")) || null,
    longitude: Number(searchParams.get("pickupLng")) || null,
  });
  const [destPlace, setDestPlace] = useState<Place>({
    address: searchParams.get("destination") ?? "",
    latitude: Number(searchParams.get("destLat")) || null,
    longitude: Number(searchParams.get("destLng")) || null,
  });

  const defaults = useMemo<TripBookingFormValues>(
    () => ({
      serviceType: parseServiceType(searchParams.get("serviceType")),
      pickupAddress: searchParams.get("pickup") ?? "",
      destinationAddress: searchParams.get("destination") ?? "",
      pickupDate: searchParams.get("date") ?? todayIsoDate(),
      pickupTime: searchParams.get("time") ?? "07:00",
      tripType: parseTripType(searchParams.get("tripType")),
      passengers: Number(searchParams.get("passengers") || 4) || 4,
      vehicleId: searchParams.get("vehicleId") ?? "",
      customerName: "",
      customerPhone: "",
      note: "",
    }),
    [searchParams],
  );

  const form = useForm<TripBookingFormValues>({
    resolver: zodResolver(tripBookingFormSchema),
    defaultValues: defaults,
  });

  const passengers = form.watch("passengers");
  const serviceType = form.watch("serviceType");
  const vehicleId = form.watch("vehicleId");
  const tripType = form.watch("tripType");
  const values = form.watch();

  useEffect(() => {
    form.reset(defaults);
    const pickupLat = Number(searchParams.get("pickupLat"));
    const pickupLng = Number(searchParams.get("pickupLng"));
    const destLat = Number(searchParams.get("destLat"));
    const destLng = Number(searchParams.get("destLng"));
    setPickupPlace({
      address: defaults.pickupAddress,
      latitude: Number.isFinite(pickupLat) ? pickupLat : null,
      longitude: Number.isFinite(pickupLng) ? pickupLng : null,
    });
    setDestPlace({
      address: defaults.destinationAddress,
      latitude: Number.isFinite(destLat) ? destLat : null,
      longitude: Number.isFinite(destLng) ? destLng : null,
    });
    // Only re-seed when URL/query defaults change — `form` identity changes every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults, searchParams]);

  useEffect(() => {
    let cancelled = false;
    setSuitable(null);
    void vehicleService
      .getSuitableVehicles({
        passengers: Number.isFinite(passengers) ? passengers : 1,
        serviceType,
      })
      .then((list) => {
        if (cancelled) return;
        setSuitable(list);
        const current = form.getValues("vehicleId");
        if (current && !list.some((v) => v.id === current)) {
          form.setValue("vehicleId", list[0]?.id ?? "");
        } else if (!current && list[0]) {
          form.setValue("vehicleId", list[0].id);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [passengers, serviceType, form]);

  const selectedVehicle = suitable?.find((v) => v.id === vehicleId) ?? null;

  async function onSubmit(data: TripBookingFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const trip = await tripService.createTrip(
        {
          serviceType: data.serviceType,
          pickup: {
            address: pickupPlace.address || data.pickupAddress,
            latitude: pickupPlace.latitude,
            longitude: pickupPlace.longitude,
          },
          destination: {
            address: destPlace.address || data.destinationAddress,
            latitude: destPlace.latitude,
            longitude: destPlace.longitude,
          },
          pickupDate: data.pickupDate,
          pickupTime: data.pickupTime,
          tripType: data.tripType,
          passengers: data.passengers,
          vehicleId: data.vehicleId,
          customer: { name: data.customerName, phone: data.customerPhone },
          note: data.note,
          clientId: getBookingClientId(),
          website: honeypotRef.current?.value ?? "",
        },
        { idempotencyKey: idempotencyKeyRef.current },
      );
      idempotencyKeyRef.current = newIdempotencyKey();
      try {
        sessionStorage.setItem("ride.lastBooking", JSON.stringify(trip));
      } catch {
        /* ignore */
      }
      trackRideEvent("booking_submitted", {
        booking_code: trip.bookingCode,
      });
      void navigate(
        `/ride/booking/success?code=${encodeURIComponent(trip.bookingCode)}`,
        { state: { trip } },
      );
    } catch (e) {
      const apiErr = e as ApiError & { code?: string };
      if (apiErr instanceof ApiError) {
        if (
          apiErr.status === 429 ||
          apiErr.code === "RATE_LIMITED" ||
          apiErr.code === "PHONE_RATE_LIMITED" ||
          apiErr.code === "CLIENT_RATE_LIMITED"
        ) {
          setSubmitError(
            "Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.",
          );
        } else if (apiErr.code === "SPAM_DETECTED") {
          setSubmitError("Không thể xử lý yêu cầu.");
        } else {
          setSubmitError(
            apiErr.message || "Không gửi được yêu cầu. Vui lòng thử lại.",
          );
        }
      } else {
        setSubmitError(
          e instanceof Error
            ? e.message
            : "Không gửi được yêu cầu. Vui lòng thử lại.",
        );
      }
      // Keep same idempotencyKey on failure so retries are safe
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Đặt chuyến</h1>
      <p className="mt-2 text-muted-foreground">
        Gửi yêu cầu đặt chuyến — xe riêng có tài xế. Nhân viên sẽ liên hệ xác
        nhận và báo giá.
      </p>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-8 space-y-10"
      >
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Thông tin chuyến đi
          </h2>

          <div className="space-y-2">
            <Label>Mục đích chuyến đi</Label>
            <Select
              value={serviceType}
              onValueChange={(v) =>
                form.setValue("serviceType", v as ServiceType, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn mục đích" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {SERVICE_TYPE_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddress">Điểm đón</Label>
            <AddressSearchInput
              id="pickupAddress"
              value={pickupPlace}
              onChange={(place) => {
                setPickupPlace(place);
                form.setValue("pickupAddress", place.address, {
                  shouldValidate: true,
                });
              }}
              error={form.formState.errors.pickupAddress?.message}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationAddress">Điểm đến</Label>
            <AddressSearchInput
              id="destinationAddress"
              value={destPlace}
              onChange={(place) => {
                setDestPlace(place);
                form.setValue("destinationAddress", place.address, {
                  shouldValidate: true,
                });
              }}
              error={form.formState.errors.destinationAddress?.message}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickupDate">Ngày đi</Label>
              <Input
                id="pickupDate"
                type="date"
                {...form.register("pickupDate")}
              />
              {form.formState.errors.pickupDate ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.pickupDate.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupTime">Giờ đón</Label>
              <Input
                id="pickupTime"
                type="time"
                {...form.register("pickupTime")}
              />
              {form.formState.errors.pickupTime ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.pickupTime.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passengers">Số khách</Label>
            <Input
              id="passengers"
              type="number"
              min={1}
              max={50}
              {...form.register("passengers", { valueAsNumber: true })}
            />
            {form.formState.errors.passengers ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.passengers.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Hình thức chuyến</Label>
            <div className="flex flex-wrap gap-2">
              {TRIP_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => form.setValue("tripType", opt)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm",
                    tripType === opt
                      ? "border-teal-800 bg-teal-800 text-teal-50"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {TRIP_TYPE_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Xe phù hợp với chuyến đi</h2>
          {suitable === null ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          ) : suitable.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Không có xe phù hợp với số khách hiện tại. Hãy giảm số khách hoặc{" "}
              <Link className="underline" to="/ride/contact">
                liên hệ
              </Link>{" "}
              để được tư vấn.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {suitable.map((v) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  selected={vehicleId === v.id}
                  onSelect={() =>
                    form.setValue("vehicleId", v.id, { shouldValidate: true })
                  }
                />
              ))}
            </div>
          )}
          {form.formState.errors.vehicleId ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.vehicleId.message}
            </p>
          ) : null}
        </section>

        <section className="relative space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Thông tin liên hệ
          </h2>
          <div className="space-y-2">
            <Label htmlFor="customerName">Họ và tên *</Label>
            <Input id="customerName" {...form.register("customerName")} />
            {form.formState.errors.customerName ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.customerName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Số điện thoại *</Label>
            <Input
              id="customerPhone"
              type="tel"
              inputMode="tel"
              {...form.register("customerPhone")}
            />
            {form.formState.errors.customerPhone ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.customerPhone.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              rows={4}
              placeholder={
                "Ví dụ:\n- Có người lớn tuổi\n- Có trẻ em\n- Có nhiều hành lý"
              }
              {...form.register("note")}
            />
          </div>
          {/* Honeypot — hidden from users; bots often fill it */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden opacity-0"
          >
            <label htmlFor="website">Website</label>
            <input
              ref={honeypotRef}
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-teal-800/20 bg-teal-50/50 p-4 dark:bg-teal-950/30 sm:p-6">
          <h2 className="text-sm font-semibold tracking-wide text-teal-900 uppercase dark:text-teal-200">
            Thông tin chuyến
          </h2>
          <ul className="space-y-2 text-sm">
            <li>{selectedVehicle?.name ?? "Chưa chọn xe"} · Có tài xế</li>
            <li>
              {values.pickupAddress || "—"} → {values.destinationAddress || "—"}
            </li>
            <li>
              {values.pickupDate || "—"} · {values.pickupTime || "—"}
            </li>
            <li>{values.passengers || "—"} khách</li>
            <li>{TRIP_TYPE_LABELS[values.tripType]}</li>
            <li>
              Giá chuyến: <strong>Liên hệ báo giá</strong>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Giá sẽ được nhân viên tính và gửi sau khi kiểm tra lộ trình.
          </p>
        </section>

        {submitError ? (
          <p className="text-sm text-destructive">{submitError}</p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="min-h-12 w-full bg-teal-800 text-base hover:bg-teal-700"
        >
          {submitting ? "Đang gửi…" : "Gửi yêu cầu đặt chuyến"}
        </Button>
      </form>
    </div>
  );
}
