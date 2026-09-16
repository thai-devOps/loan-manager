import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PricingRow } from "@/features/ride/data/mock-pricing";
import { useRidePageMeta } from "@/features/ride/lib/use-ride-page-meta";
import { pricingService } from "@/features/ride/services/pricingService";

export function RidePricingPage() {
  useRidePageMeta(
    "Bảng giá",
    "Bảng giá tham khảo dịch vụ xe có tài xế — liên hệ báo giá theo lộ trình.",
  );

  const [rows, setRows] = useState<PricingRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void pricingService.getReferencePricing().then((list) => {
      if (!cancelled) setRows(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        Bảng giá tham khảo
      </h1>
      <p className="mt-2 text-muted-foreground">
        Đây là dịch vụ chở khách theo chuyến (xe + tài xế). Giá cụ thể phụ thuộc
        lộ trình và lịch trình — chúng tôi không hiển thị số tiền giả.
      </p>

      <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
        {rows === null
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-28" />
              </div>
            ))
          : rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="font-medium">{row.title}</p>
                <p className="text-sm text-muted-foreground">{row.description}</p>
              </div>
            ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Sau khi gửi yêu cầu đặt chuyến, nhân viên sẽ kiểm tra lộ trình và báo
        giá chính xác.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-teal-800 hover:bg-teal-700">
          <Link to="/ride/booking">Đặt chuyến</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/ride/contact">Liên hệ tư vấn</Link>
        </Button>
      </div>
    </div>
  );
}
