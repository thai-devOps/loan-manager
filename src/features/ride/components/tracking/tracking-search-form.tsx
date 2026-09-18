import { Loader2, Search } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TripLookupFormValues } from "@/features/ride/schemas/trip-booking.schema";
import { cn } from "@/lib/utils";

export function TrackingSearchForm({
  form,
  loading,
  onSubmit,
}: Readonly<{
  form: UseFormReturn<TripLookupFormValues>;
  loading: boolean;
  onSubmit: (values: TripLookupFormValues) => void | Promise<void>;
}>) {
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn(
        "-mt-12 space-y-4 rounded-2xl border border-border bg-card/90 p-4 shadow-lg shadow-teal-950/5 backdrop-blur-sm sm:p-6",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-both motion-safe:duration-500",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-teal-900 dark:text-teal-200">
        <Search className="size-4 shrink-0" aria-hidden />
        Thông tin tra cứu
      </div>

      <div className="space-y-2">
        <Label htmlFor="bookingCode">Mã chuyến</Label>
        <Input
          id="bookingCode"
          placeholder="TRIP1025"
          autoComplete="off"
          className="font-mono tracking-wide"
          {...form.register("bookingCode")}
        />
        {form.formState.errors.bookingCode ? (
          <p className="text-sm text-destructive" role="alert">
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
          autoComplete="tel"
          {...form.register("phone")}
        />
        {form.formState.errors.phone ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.phone.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-teal-800 transition-colors hover:bg-teal-700"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Đang tra cứu…
          </>
        ) : (
          <>
            <Search className="size-4" aria-hidden />
            Tra cứu
          </>
        )}
      </Button>
    </form>
  );
}
