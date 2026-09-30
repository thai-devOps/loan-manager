import { RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/common/status-badges";
import { StatCardsSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGoldPricesLatestQuery } from "@/api/queries";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import { formatBranchLabel } from "@/features/assets/lib/resolve-reference-price";
import { cn } from "@/lib/utils";

function formatPriceCell(value: number | null | undefined): string {
  if (value == null || !(value > 0)) return "—";
  return formatCurrency(value);
}

function spreadVnd(
  buy: number | null | undefined,
  sell: number | null | undefined,
): number | null {
  if (buy == null || sell == null || !(buy > 0) || !(sell > 0)) return null;
  return sell - buy;
}

export function AssetsGoldPricesPage() {
  const pricesQ = useGoldPricesLatestQuery(true);
  const data = pricesQ.data;
  const prices = data?.prices ?? [];

  if (pricesQ.isLoading) {
    return <StatCardsSkeleton />;
  }

  if (pricesQ.isError || !data) {
    return (
      <EmptyState
        title="Không thể tải bảng giá PNJ"
        description="Thử lại sau vài giây, hoặc kiểm tra đồng bộ giá vàng trên server."
        action={
          <Button variant="outline" onClick={() => void pricesQ.refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  if (prices.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader onRefresh={() => void pricesQ.refetch()} refreshing={pricesQ.isFetching} />
        <EmptyState
          title="Chưa có snapshot giá vàng"
          description="Chạy sync PNJ (/api/jobs/gold-price-sync) hoặc đợi cron hàng ngày để lấy bảng giá."
          action={
            <Button variant="outline" onClick={() => void pricesQ.refetch()}>
              Làm mới
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        onRefresh={() => void pricesQ.refetch()}
        refreshing={pricesQ.isFetching}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Giá theo chỉ (VND)</CardTitle>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              PNJ · {formatBranchLabel(data.branch)}
              {data.zone ? ` · zone ${data.zone}` : ""}
            </span>
            {data.sourceUpdatedAt && (
              <span>Nguồn: {formatDateTime(data.sourceUpdatedAt)}</span>
            )}
            <span>Snapshot: {formatDateTime(data.capturedAt)}</span>
            {data.stale && (
              <span className="rounded-md border border-amber-300/70 bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                Snapshot cũ
              </span>
            )}
          </div>
          {data.note ? (
            <p className="text-xs text-muted-foreground">{data.note}</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Mã</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead className="text-right">Mua vào</TableHead>
                  <TableHead className="text-right">Bán ra</TableHead>
                  <TableHead className="text-right">Chênh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.map((p) => {
                  const spread = spreadVnd(p.buyPricePerChi, p.sellPricePerChi);
                  return (
                    <TableRow key={p.sourceCode}>
                      <TableCell className="font-medium tabular-nums">
                        {p.sourceCode}
                      </TableCell>
                      <TableCell>{p.sourceName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPriceCell(p.buyPricePerChi)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPriceCell(p.sellPricePerChi)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          spread != null && spread > 0
                            ? "text-muted-foreground"
                            : "",
                        )}
                      >
                        {spread != null ? formatCurrency(spread) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {prices.map((p) => {
              const spread = spreadVnd(p.buyPricePerChi, p.sellPricePerChi);
              return (
                <div key={p.sourceCode} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{p.sourceName}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {p.sourceCode}
                      </p>
                    </div>
                    {spread != null && (
                      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        Chênh {formatCurrency(spread)}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Mua vào</p>
                      <p className="font-semibold tabular-nums">
                        {formatPriceCell(p.buyPricePerChi)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Bán ra</p>
                      <p className="font-semibold tabular-nums">
                        {formatPriceCell(p.sellPricePerChi)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PageHeader({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold">Bảng giá vàng PNJ</h2>
        <p className="text-sm text-muted-foreground">
          Giá mua vào / bán ra mới nhất theo từng loại vàng (₫/chỉ). Chỉ để
          quan sát — không thay đổi giá vốn giao dịch đã ghi.
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5"
        onClick={onRefresh}
        disabled={refreshing}
      >
        <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        Làm mới
      </Button>
    </div>
  );
}
