import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  quickBookingSchema,
  type QuickBookingFormValues,
} from "@/features/ride/schemas/trip-booking.schema";
import type { TripType } from "@/features/ride/types/ride";
import { TRIP_TYPE_LABELS } from "@/features/ride/lib/labels";
import { cn } from "@/lib/utils";

const TRIP_OPTIONS: TripType[] = ["ONE_WAY", "ROUND_TRIP", "DAILY"];

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  className?: string;
  defaultServiceType?: string;
};

export function QuickBookingForm({ className, defaultServiceType }: Props) {
  const navigate = useNavigate();
  const form = useForm<QuickBookingFormValues>({
    resolver: zodResolver(quickBookingSchema),
    defaultValues: {
      pickup: "",
      destination: "",
      pickupDate: todayIsoDate(),
      pickupTime: "07:00",
      passengers: 4,
      tripType: "ONE_WAY",
    },
  });

  const tripType = form.watch("tripType");

  function onSubmit(values: QuickBookingFormValues) {
    const params = new URLSearchParams({
      pickup: values.pickup,
      destination: values.destination,
      date: values.pickupDate,
      time: values.pickupTime,
      passengers: String(values.passengers),
      tripType: values.tripType,
    });
    if (defaultServiceType) {
      params.set("serviceType", defaultServiceType);
    }
    void navigate(`/ride/booking?${params.toString()}`);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6",
        className,
      )}
    >
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
        Bạn muốn đi đâu?
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Nhập hành trình để tìm xe phù hợp — xe riêng có tài xế.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TRIP_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => form.setValue("tripType", opt)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              tripType === opt
                ? "border-teal-800 bg-teal-800 text-teal-50"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {TRIP_TYPE_LABELS[opt]}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="qb-pickup">Điểm đón</Label>
          <Input
            id="qb-pickup"
            placeholder="Ví dụ: địa chỉ đón của bạn"
            {...form.register("pickup")}
          />
          {form.formState.errors.pickup ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.pickup.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="qb-destination">Điểm đến</Label>
          <Input
            id="qb-destination"
            placeholder="Ví dụ: địa chỉ đến của bạn"
            {...form.register("destination")}
          />
          {form.formState.errors.destination ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.destination.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="qb-date">Ngày đi</Label>
          <Input id="qb-date" type="date" {...form.register("pickupDate")} />
          {form.formState.errors.pickupDate ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.pickupDate.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="qb-time">Giờ đón</Label>
          <Input id="qb-time" type="time" {...form.register("pickupTime")} />
          {form.formState.errors.pickupTime ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.pickupTime.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="qb-passengers">Số khách</Label>
          <Input
            id="qb-passengers"
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
      </div>

      <Button
        type="submit"
        size="lg"
        className="mt-6 min-h-11 w-full bg-teal-800 text-base hover:bg-teal-700"
      >
        Tìm xe phù hợp
      </Button>
    </form>
  );
}
