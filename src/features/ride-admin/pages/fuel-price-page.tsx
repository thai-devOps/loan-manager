import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Can } from "@/features/auth/can";
import { fuelPriceAdminService } from "@/features/ride-admin/services/admin-api";
import { rideAdminQueryKeys } from "@/features/ride-admin/query-keys";
import { PERMISSIONS } from "@/config/permissions";
import { ApiError } from "@/api/client";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

function formatChange(change: number | null | undefined): string {
  if (change == null) return "—";
  if (change > 0) return `+${change.toLocaleString("vi-VN")}`;
  return change.toLocaleString("vi-VN");
}

function changeClass(change: number | null | undefined): string {
  if (change == null) return "text-muted-foreground";
  if (change > 0) return "text-rose-700 dark:text-rose-400";
  if (change < 0) return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}

export function RideAdminFuelPricePage() {
  const queryClient = useQueryClient();

  const currentQ = useQuery({
    queryKey: rideAdminQueryKeys.fuelCurrent(),
    queryFn: () => fuelPriceAdminService.current(),
    retry: 1,
  });

  const historyQ = useQuery({
    queryKey: rideAdminQueryKeys.fuelHistory(1),
    queryFn: () => fuelPriceAdminService.history({ page: 1, limit: 10 }),
  });

  const syncMut = useMutation({
    mutationFn: () => fuelPriceAdminService.sync(),
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: rideAdminQueryKeys.fuelCurrent(),
        }),
        queryClient.invalidateQueries({
          queryKey: [...rideAdminQueryKeys.all, "fuel-history"],
        }),
      ]);
      if (data.status === "already_synced") {
        toast.message("Đã đồng bộ trước đó", {
          description: data.effectiveAt
            ? `Hiệu lực: ${formatDateTime(data.effectiveAt)}`
            : undefined,
        });
        return;
      }
      toast.success("Đã đồng bộ giá xăng dầu từ PVOIL");
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Không thể đồng bộ giá xăng dầu từ PVOIL.";
      toast.error(msg);
    },
  });

  const data = currentQ.data;
  const missing =
    currentQ.isError &&
    currentQ.error instanceof ApiError &&
    currentQ.error.status === 404;
  const currentErrorMessage =
    currentQ.error instanceof ApiError
      ? currentQ.error.message
      : "Không tải được giá xăng dầu.";
  const historyItems = historyQ.data?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Giá xăng dầu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bảng giá PVOIL (server sync). Không gọi PVOIL từ trình duyệt.
          </p>
        </div>
        <Can permission={PERMISSIONS.FLEET_PRICING_UPDATE}>
          <Button
            type="button"
            className="gap-1.5"
            disabled={syncMut.isPending}
            onClick={() => syncMut.mutate()}
          >
            <RefreshCw
              className={cn("size-4", syncMut.isPending && "animate-spin")}
            />
            {syncMut.isPending ? "Đang đồng bộ…" : "Đồng bộ ngay"}
          </Button>
        </Can>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="space-y-1">
          <h2 className="font-semibold">Giá hiện tại (PVOIL)</h2>
          {currentQ.isLoading && <Skeleton className="h-4 w-64" />}
          {!currentQ.isLoading && data && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Nguồn: {data.source}</span>
              <span>Cập nhật: {formatDateTime(data.effectiveAt)}</span>
              <span>Đồng bộ lúc: {formatDateTime(data.crawledAt)}</span>
            </div>
          )}
          {!currentQ.isLoading && !data && missing && (
            <p className="text-sm text-muted-foreground">
              Chưa có dữ liệu giá xăng dầu. Bấm Đồng bộ ngay để lấy từ PVOIL.
            </p>
          )}
          {!currentQ.isLoading && !data && !missing && (
            <p className="text-sm text-destructive">{currentErrorMessage}</p>
          )}
        </div>

        {currentQ.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        )}
        {data && (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mặt hàng</TableHead>
                  <TableHead className="text-right">Giá</TableHead>
                  <TableHead className="text-right">Chênh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.map((p) => (
                  <TableRow key={p.code}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {p.code}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatCurrency(p.price)}/L
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        changeClass(p.change),
                      )}
                    >
                      {formatChange(p.change)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-semibold">Lịch sử giá</h2>
        {historyQ.isLoading && <Skeleton className="h-24 w-full rounded-xl" />}
        {!historyQ.isLoading && historyQ.isError && (
          <p className="text-sm text-destructive">Không tải được lịch sử.</p>
        )}
        {!historyQ.isLoading && !historyQ.isError && historyItems.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có lịch sử.</p>
        )}
        {!historyQ.isLoading && !historyQ.isError && historyItems.length > 0 && (
          <div className="space-y-2">
            {historyItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatDateTime(item.effectiveAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.products.length} mặt hàng · sync{" "}
                    {formatDateTime(item.crawledAt)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {item.effectiveDateRaw}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
