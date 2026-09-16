import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { VehicleCard } from "@/features/ride/components/vehicle-card";
import {
  tripBookingFormSchema,
  type TripBookingFormValues,
} from "@/features/ride/schemas/trip-booking.schema";
import {
  SERVICE_TYPE_LABELS,
  TRIP_TYPE_LABELS,
} from "@/features/ride/lib/labels";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { pricingService } from "@/features/ride/services/pricingService";
import { tripService } from "@/features/ride/services/tripService";
import { vehicleService } from "@/features/ride/services/vehicleService";
import type {
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
  useRidePageMeta(
    "Đặt chuyến",
    "Gửi yêu cầu đặt chuyến xe riêng có tài xế.",
  );

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [suitable, setSuitable] = useState<Vehicle[] | null>(null);
  const [quoteDisplay, setQuoteDisplay] = useState("Liên hệ báo giá");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
  }, [defaults, form]);

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

  useEffect(() => {
    let cancelled = false;
    void pricingService.getQuote({ serviceType, tripType, vehicleId }).then((q) => {
      if (!cancelled) setQuoteDisplay(q.display);
    });
    return () => {
      cancelled = true;
    };
  }, [serviceType, tripType, vehicleId]);

  const selectedVehicle = suitable?.find((v) => v.id === vehicleId) ?? null;

  async function onSubmit(data: TripBookingFormValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const trip = await tripService.createTrip({
        serviceType: data.serviceType,
        pickup: { address: data.pickupAddress },
        destination: { address: data.destinationAddress },
        pickupDate: data.pickupDate,
        pickupTime: data.pickupTime,
        tripType: data.tripType,
        passengers: data.passengers,
        vehicleId: data.vehicleId,
        customer: { name: data.customerName, phone: data.customerPhone },
        note: data.note,
      });
      try {
        sessionStorage.setItem(
          "ride.lastBooking",
          JSON.stringify(trip),
        );
      } catch {
        /* ignore */
      }
      void navigate(`/ride/booking/success?code=${encodeURIComponent(trip.bookingCode)}`, {
        state: { trip },
      });
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Không gửi được yêu cầu. Vui lòng thử lại.",
      );
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
        {/* Trip info */}
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
            <Input id="pickupAddress" {...form.register("pickupAddress")} />
            {form.formState.errors.pickupAddress ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.pickupAddress.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationAddress">Điểm đến</Label>
            <Input
              id="destinationAddress"
              {...form.register("destinationAddress")}
            />
            {form.formState.errors.destinationAddress ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.destinationAddress.message}
              </p>
            ) : null}
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

        {/* Vehicles */}
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
          <p className="text-sm text-muted-foreground">
            Giá chuyến: <span className="font-medium text-foreground">{quoteDisplay}</span>
          </p>
        </section>

        {/* Customer */}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
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
                "Ví dụ:\n- Có người lớn tuổi\n- Có trẻ em\n- Có nhiều hành lý\n- Cần đón tại bệnh viện\n- Có nhiều điểm dừng"
              }
              {...form.register("note")}
            />
          </div>
        </section>

        {/* Summary */}
        <section className="space-y-3 rounded-2xl border border-teal-800/20 bg-teal-50/50 p-4 dark:bg-teal-950/30 sm:p-6">
          <h2 className="text-sm font-semibold tracking-wide text-teal-900 uppercase dark:text-teal-200">
            Thông tin chuyến
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              {selectedVehicle?.name ?? "Chưa chọn xe"} · Có tài xế
            </li>
            <li>
              {values.pickupAddress || "—"} → {values.destinationAddress || "—"}
            </li>
            <li>
              {values.pickupDate || "—"} · {values.pickupTime || "—"}
            </li>
            <li>{values.passengers || "—"} khách</li>
            <li>{TRIP_TYPE_LABELS[values.tripType]}</li>
            <li>
              Giá chuyến:{" "}
              <strong>Đang xác nhận</strong>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Giá sẽ được xác nhận sau khi nhân viên kiểm tra lộ trình.
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
