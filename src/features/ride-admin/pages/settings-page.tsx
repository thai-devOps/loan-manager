import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Can } from "@/features/auth/can";
import { ConfirmDeleteDialog } from "@/features/ride-admin/components/confirm-delete-dialog";
import { rideSettingsAdminService } from "@/features/ride-admin/services/admin-api";
import { PERMISSIONS } from "@/config/permissions";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";

export function RideAdminSettingsPage() {
  const queryClient = useQueryClient();
  const [confirmDisable, setConfirmDisable] = useState(false);
  const settingsQ = useQuery({
    queryKey: ["ride-admin", "settings"],
    queryFn: () => rideSettingsAdminService.get(),
  });

  const saveMut = useMutation({
    mutationFn: (bookingAntiSpamEnabled: boolean) =>
      rideSettingsAdminService.update({ bookingAntiSpamEnabled }),
    onSuccess: async (_data, enabled) => {
      await queryClient.invalidateQueries({
        queryKey: ["ride-admin", "settings"],
      });
      toast.success(
        enabled ? "Đã bật chặn spam" : "Đã tắt chặn spam",
      );
      setConfirmDisable(false);
    },
  });

  const data = settingsQ.data;
  const enabled = data?.bookingAntiSpamEnabled ?? true;
  let error: string | null = null;
  if (saveMut.error instanceof ApiError) error = saveMut.error.message;
  else if (saveMut.error) error = "Không lưu được cài đặt";
  else if (settingsQ.error instanceof ApiError) error = settingsQ.error.message;
  else if (settingsQ.error) error = "Không tải được cài đặt";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cài đặt vận hành
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cấu hình bảo vệ form đặt chuyến công khai.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="space-y-1">
          <h2 className="font-semibold">Chặn spam đặt chuyến</h2>
          <p className="text-sm text-muted-foreground">
            Khi bật: honeypot + giới hạn gửi theo IP / SĐT / thiết bị. Khi tắt:
            bỏ các chặn này (vẫn giữ chống gửi trùng Idempotency-Key nếu client
            gửi kèm).
          </p>
        </div>

        {settingsQ.isLoading ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <Label>Trạng thái hiện tại</Label>
              <p
                className={cn(
                  "text-sm font-medium",
                  enabled
                    ? "text-teal-800 dark:text-teal-200"
                    : "text-amber-700 dark:text-amber-300",
                )}
              >
                {enabled ? "Đang chặn spam" : "Đã tắt chặn spam"}
                <span className="ml-1 font-normal text-muted-foreground">
                  {data?.bookingAntiSpamSource === "env"
                    ? "(theo env)"
                    : "(đã lưu trên hệ thống)"}
                </span>
              </p>
              {data ? (
                <p className="text-xs text-muted-foreground">
                  Mặc định env: {data.envDefault ? "bật" : "tắt"} (
                  <code className="text-xs">BOOKING_ANTI_SPAM_ENABLED</code>)
                </p>
              ) : null}
            </div>

            <Can permission={PERMISSIONS.FLEET_BOOKING_UPDATE}>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={enabled ? "outline" : "default"}
                  className={
                    !enabled ? "bg-teal-800 hover:bg-teal-700" : undefined
                  }
                  disabled={saveMut.isPending || enabled}
                  onClick={() => saveMut.mutate(true)}
                >
                  Bật chặn
                </Button>
                <Button
                  type="button"
                  variant={enabled ? "destructive" : "outline"}
                  disabled={saveMut.isPending || !enabled}
                  onClick={() => setConfirmDisable(true)}
                >
                  Tắt chặn
                </Button>
              </div>
            </Can>
          </div>
        )}
      </section>

      <ConfirmDeleteDialog
        open={confirmDisable}
        onOpenChange={(open) => {
          if (!open && !saveMut.isPending) setConfirmDisable(false);
        }}
        title="Tắt chặn spam?"
        description="Form đặt chuyến sẽ không giới hạn số lần gửi theo IP / SĐT / thiết bị."
        confirmLabel="Tắt chặn"
        pending={saveMut.isPending}
        onConfirm={() => saveMut.mutate(false)}
      />
    </div>
  );
}
