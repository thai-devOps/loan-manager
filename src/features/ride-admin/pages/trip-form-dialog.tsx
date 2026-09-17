import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  ResponsiveFormFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import {
  bookingAdminService,
  tripAdminService,
} from "@/features/ride-admin/services/admin-api";
import { TRIP_TYPE_LABELS } from "@/features/ride/lib/labels";
import type { Driver, RideTrip, TripType, Vehicle } from "@/features/ride/types/ride";
import {
  rideTripFormSchema,
  type RideTripFormValues,
} from "@/schemas/ride-trip.schema";
import { MoneyInput } from "@/features/finance/components/money-input";
import { ApiError } from "@/api/client";

const TYPES = Object.keys(TRIP_TYPE_LABELS) as TripType[];

const emptyDefaults: RideTripFormValues = {
  customerName: "",
  customerPhone: "",
  pickupAddress: "",
  destinationAddress: "",
  routeLabel: "",
  pickupDate: "",
  pickupTime: "",
  returnDate: "",
  returnTime: "",
  vehicleId: "",
  driverId: "",
  tripType: "ONE_WAY",
  passengers: 1,
  note: "",
  tripPrice: 0,
  expenseTotal: 0,
  revenueAmount: 0,
};

export function TripFormDialog({
  open,
  onOpenChange,
  trip,
  bookingId,
  vehicles,
  drivers,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: RideTrip | null;
  bookingId?: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  onSaved: (trip: RideTrip) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(trip);

  const form = useForm<RideTripFormValues>({
    resolver: zodResolver(rideTripFormSchema),
    defaultValues: emptyDefaults,
  });

  const tripType = form.watch("tripType");

  useEffect(() => {
    if (!open) return;
    setError(null);
    let cancelled = false;

    void (async () => {
      if (trip) {
        form.reset({
          customerName: trip.customer?.name ?? "",
          customerPhone: trip.customer?.phone ?? "",
          pickupAddress: trip.pickup?.address ?? "",
          destinationAddress: trip.destination?.address ?? "",
          routeLabel: trip.routeLabel ?? "",
          pickupDate: trip.pickupDate,
          pickupTime: trip.pickupTime,
          returnDate: trip.returnDate ?? "",
          returnTime: trip.returnTime ?? "",
          vehicleId: trip.vehicleId ?? "",
          driverId: trip.driverId ?? "",
          tripType: trip.tripType ?? "ONE_WAY",
          passengers: trip.passengers || 1,
          note: trip.note ?? "",
          tripPrice: trip.tripPrice || 0,
          expenseTotal: trip.expenseTotal || 0,
          revenueAmount: trip.revenueAmount || 0,
        });
        return;
      }

      if (bookingId) {
        try {
          const b = await bookingAdminService.get(bookingId);
          if (cancelled) return;
          form.reset({
            ...emptyDefaults,
            customerName: b.customer.name,
            customerPhone: b.customer.phone,
            pickupAddress: b.pickup.address,
            destinationAddress: b.destination.address,
            pickupDate: b.pickupDate,
            pickupTime: b.pickupTime,
            vehicleId: b.vehicleId || "",
            driverId: b.driverId || "",
            tripType: b.tripType,
            passengers: b.passengers,
            note: b.note ?? "",
            tripPrice: b.quotedPrice ?? 0,
            revenueAmount: b.paidAmount ?? 0,
          });
        } catch (e) {
          if (!cancelled) {
            setError(
              e instanceof ApiError ? e.message : "Không tải booking để tạo chuyến",
            );
            form.reset(emptyDefaults);
          }
        }
        return;
      }

      form.reset(emptyDefaults);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, trip, bookingId, form]);

  async function onSubmit(values: RideTripFormValues) {
    setBusy(true);
    setError(null);
    try {
      if (bookingId && !trip) {
        const created = await tripAdminService.create({ bookingId });
        onSaved(created);
        return;
      }

      const payload = {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        pickupAddress: values.pickupAddress,
        destinationAddress: values.destinationAddress,
        routeLabel: values.routeLabel || undefined,
        pickupDate: values.pickupDate,
        pickupTime: values.pickupTime,
        returnDate: values.returnDate || null,
        returnTime: values.returnTime || null,
        vehicleId: values.vehicleId || null,
        driverId: values.driverId || null,
        tripType: values.tripType,
        passengers: values.passengers,
        note: values.note || undefined,
        tripPrice: values.tripPrice ?? 0,
        expenseTotal: values.expenseTotal ?? 0,
        revenueAmount: values.revenueAmount ?? 0,
      };

      if (trip) {
        const updated = await tripAdminService.update(trip.id, payload);
        onSaved(updated);
      } else {
        const created = await tripAdminService.create(payload);
        onSaved(created);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lưu chuyến thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Sửa chuyến xe" : bookingId ? "Tạo chuyến từ booking" : "Tạo chuyến xe"}
      desktopClassName="sm:max-w-xl"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          {bookingId && !trip ? (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Thông tin sẽ được sao chép từ booking. Bạn có thể chỉnh sau khi tạo.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Khách hàng</Label>
              <Input
                id="customerName"
                disabled={Boolean(bookingId && !trip)}
                {...form.register("customerName")}
              />
              {form.formState.errors.customerName ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.customerName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">SĐT</Label>
              <Input
                id="customerPhone"
                disabled={Boolean(bookingId && !trip)}
                {...form.register("customerPhone")}
              />
              {form.formState.errors.customerPhone ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.customerPhone.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddress">Điểm đón</Label>
            <Input
              id="pickupAddress"
              disabled={Boolean(bookingId && !trip)}
              {...form.register("pickupAddress")}
            />
            {form.formState.errors.pickupAddress ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.pickupAddress.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="destinationAddress">Điểm trả</Label>
            <Input
              id="destinationAddress"
              disabled={Boolean(bookingId && !trip)}
              {...form.register("destinationAddress")}
            />
            {form.formState.errors.destinationAddress ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.destinationAddress.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="routeLabel">Tuyến đường</Label>
            <Input id="routeLabel" {...form.register("routeLabel")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickupDate">Ngày đi</Label>
              <Input
                id="pickupDate"
                type="date"
                disabled={Boolean(bookingId && !trip)}
                {...form.register("pickupDate")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickupTime">Giờ đón</Label>
              <Input
                id="pickupTime"
                type="time"
                disabled={Boolean(bookingId && !trip)}
                {...form.register("pickupTime")}
              />
            </div>
          </div>

          {tripType === "ROUND_TRIP" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="returnDate">Ngày về</Label>
                <Input id="returnDate" type="date" {...form.register("returnDate")} />
                {form.formState.errors.returnDate ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.returnDate.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="returnTime">Giờ về</Label>
                <Input id="returnTime" type="time" {...form.register("returnTime")} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại chuyến</Label>
              <Select
                value={form.watch("tripType")}
                onValueChange={(v) =>
                  form.setValue("tripType", v as TripType, { shouldValidate: true })
                }
                disabled={Boolean(bookingId && !trip)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRIP_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="passengers">Số khách</Label>
              <Input
                id="passengers"
                type="number"
                min={1}
                disabled={Boolean(bookingId && !trip)}
                value={form.watch("passengers")}
                onChange={(e) =>
                  form.setValue("passengers", Number(e.target.value) || 1, {
                    shouldValidate: true,
                  })
                }
              />
            </div>
          </div>

          {!bookingId || trip ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Xe</Label>
                  <Select
                    value={form.watch("vehicleId") || "none"}
                    onValueChange={(v) =>
                      form.setValue("vehicleId", v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn xe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chưa chọn</SelectItem>
                      {vehicles
                        .filter((v) => v.active)
                        .map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tài xế</Label>
                  <Select
                    value={form.watch("driverId") || "none"}
                    onValueChange={(v) =>
                      form.setValue("driverId", v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn tài xế" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chưa chọn</SelectItem>
                      {drivers
                        .filter((d) => d.active)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="tripPrice">Giá chuyến</Label>
                  <MoneyInput
                    id="tripPrice"
                    value={form.watch("tripPrice") ?? 0}
                    onChange={(v) =>
                      form.setValue("tripPrice", v, { shouldValidate: true })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseTotal">Chi phí</Label>
                  <MoneyInput
                    id="expenseTotal"
                    value={form.watch("expenseTotal") ?? 0}
                    onChange={(v) =>
                      form.setValue("expenseTotal", v, { shouldValidate: true })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revenueAmount">Doanh thu</Label>
                  <MoneyInput
                    id="revenueAmount"
                    value={form.watch("revenueAmount") ?? 0}
                    onChange={(v) =>
                      form.setValue("revenueAmount", v, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Ghi chú</Label>
                <Input id="note" {...form.register("note")} />
              </div>
            </>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <ResponsiveFormFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={busy}
            className="bg-teal-800 hover:bg-teal-700"
          >
            {busy ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo chuyến"}
          </Button>
        </ResponsiveFormFooter>
      </form>
    </ResponsiveFormShell>
  );
}
