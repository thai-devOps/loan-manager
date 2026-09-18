import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { pricingService } from "@/features/ride/services/pricingService";
import type { PublicMatrixRoute } from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";

function formatPriceCell(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return "Liên hệ";
  }
  return formatCurrency(amount);
}

function RoutePricingSection({ route }: { route: PublicMatrixRoute }) {
  return (
    <section className="space-y-3" aria-labelledby={`route-${route.id}`}>
      <h2
        id={`route-${route.id}`}
        className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
      >
        {route.name}
      </h2>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-teal-800 text-left text-teal-50 dark:bg-teal-700">
              <th className="px-3 py-3 font-semibold">Loại xe</th>
              {route.tripTypes.map((tt) => (
                <th
                  key={tt.id}
                  className="px-3 py-3 text-center font-semibold"
                >
                  {tt.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {route.vehicles.map((vehicle, idx) => (
              <tr
                key={vehicle.id}
                className={
                  idx % 2 === 0
                    ? "bg-card"
                    : "bg-muted/40 dark:bg-muted/20"
                }
              >
                <th
                  scope="row"
                  className="px-3 py-3 text-left font-semibold text-foreground"
                >
                  {vehicle.name}
                </th>
                {route.tripTypes.map((tt) => {
                  const amount = vehicle.prices[tt.id] ?? null;
                  const label = formatPriceCell(amount);
                  return (
                    <td
                      key={tt.id}
                      className={cn(
                        "px-3 py-3 text-center tabular-nums",
                        amount == null
                          ? "text-muted-foreground"
                          : "font-medium text-foreground",
                      )}
                    >
                      {label}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked */}
      <div className="space-y-3 md:hidden">
        {route.vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <h3 className="border-b border-teal-800/15 pb-2 text-base font-semibold text-teal-900 dark:border-teal-300/20 dark:text-teal-200">
              {vehicle.name}
            </h3>
            <ul className="mt-3 space-y-2.5">
              {route.tripTypes.map((tt) => {
                const amount = vehicle.prices[tt.id] ?? null;
                return (
                  <li
                    key={tt.id}
                    className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {tt.name}
                    </span>
                    <span
                      className={cn(
                        "text-base tabular-nums",
                        amount == null
                          ? "text-muted-foreground"
                          : "font-semibold text-foreground",
                      )}
                    >
                      {formatPriceCell(amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RidePricingPage() {
  useRidePageMeta(
    "Bảng giá",
    "Bảng giá xe có tài xế theo tuyến — rõ ràng, dễ so sánh.",
  );

  const query = useQuery({
    queryKey: ["ride", "pricing", "matrix"],
    queryFn: () => pricingService.getPublicMatrix(),
  });

  let errorMessage: string | null = null;
  if (query.error instanceof ApiError) errorMessage = query.error.message;
  else if (query.error) errorMessage = "Không tải được bảng giá.";

  const routes = query.data?.routes ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-medium tracking-[0.18em] text-teal-800/70 uppercase dark:text-teal-300/70">
        SiTha Trip
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
        Bảng giá
      </h1>
      <p className="mt-2 text-muted-foreground">
        Giá theo tuyến, loại xe và hình thức chuyến. Giá cuối cùng có thể thay
        đổi theo điểm đón/trả thực tế.
      </p>

      <div className="mt-8 space-y-10">
        {query.isLoading ? (
          <>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </>
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        {!query.isLoading && !errorMessage && routes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Chưa có tuyến giá đang áp dụng. Vui lòng liên hệ để được báo giá.
          </p>
        ) : null}

        {routes.map((route) => (
          <RoutePricingSection key={route.id} route={route} />
        ))}
      </div>

      <div className="mt-12 space-y-3 rounded-2xl border border-teal-800/20 bg-teal-50/50 p-5 dark:bg-teal-950/30">
        <h2 className="text-lg font-semibold text-teal-900 dark:text-teal-200">
          Không thấy tuyến bạn cần?
        </h2>
        <p className="text-sm text-muted-foreground">
          Giá có thể thay đổi tùy điểm đón, điểm trả, thời gian chờ và yêu cầu
          riêng.
        </p>
        <Button asChild className="bg-teal-800 hover:bg-teal-700">
          <Link to="/ride/booking">Nhận báo giá nhanh</Link>
        </Button>
      </div>
    </div>
  );
}
