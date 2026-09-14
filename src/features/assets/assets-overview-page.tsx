import { Link } from "react-router-dom";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import {
  EmptyState,
  StatCard,
} from "@/components/common/status-badges";
import { StatCardsSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAssetSnapshotsQuery,
  useAssetSummaryQuery,
} from "@/api/queries";
import { formatCurrency } from "@/lib/currency";
import {
  calculateGoldGoalProgress,
} from "@/features/assets/lib/calculations";
import { formatGoldQuantity } from "@/features/assets/lib/gold-units";
import { cn } from "@/lib/utils";

const COLORS = ["#334155", "#0f766e", "#a16207", "#64748b"];

export function AssetsOverviewPage() {
  const summaryQ = useAssetSummaryQuery();
  const [range, setRange] = useState<6 | 12>(12);
  const snapshotsQ = useAssetSnapshotsQuery(range);

  if (summaryQ.isLoading) {
    return <StatCardsSkeleton />;
  }

  if (summaryQ.isError || !summaryQ.data) {
    return (
      <EmptyState
        title="Không thể tải dữ liệu tài sản"
        description="Thử lại sau vài giây."
        action={
          <Button variant="outline" onClick={() => void summaryQ.refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const s = summaryQ.data;
  const segments = s.allocation.segments.filter((seg) => seg.amount > 0);
  const planProgress = s.plan
    ? calculateGoldGoalProgress(s.goldCost, s.plan.targetAmount)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng tài sản"
          value={formatCurrency(s.totalAssets)}
          hint="Tổng giá trị tài sản hiện tại"
        />
        <StatCard
          title="Vốn đang cho vay"
          value={formatCurrency(s.lentCapital)}
          hint="Vốn đang nằm trong các khoản vay"
        />
        <StatCard
          title="Tiền khả dụng"
          value={formatCurrency(s.availableCash)}
          hint="Tiền mặt và tiền có thể sử dụng"
        />
        <StatCard
          title="Vàng"
          value={formatCurrency(s.goldValue)}
          hint={
            s.totalGoldPhan > 0
              ? `Ước tính · ${formatGoldQuantity(s.totalGoldPhan)}`
              : "Giá trị vàng ước tính hiện tại"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Phân bổ tài sản</CardTitle>
          </CardHeader>
          <CardContent>
            {s.totalAssets === 0 ? (
              <EmptyState
                title="Chưa có tài sản được quản lý"
                description="Thêm tiền mặt, ngân hàng hoặc ghi nhận vàng để xem phân bổ."
                action={
                  <Button asChild size="sm">
                    <Link to="/assets/holdings">Thêm tài sản</Link>
                  </Button>
                }
              />
            ) : (
              <>
                <div className="hidden h-64 md:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={segments}
                        dataKey="amount"
                        nameKey="label"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {segments.map((_, i) => (
                          <Cell
                            key={segments[i]!.key}
                            fill={COLORS[i % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          formatCurrency(Number(value ?? 0))
                        }
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 md:hidden">
                  {segments.map((seg, i) => (
                    <div key={seg.key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{seg.label}</span>
                        <span className="font-medium">
                          {formatCurrency(seg.amount)} · {seg.percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(seg.percent, 100)}%`,
                            background: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/assets/allocation">
                      Xem phân bổ vốn
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kế hoạch tích lũy vàng</CardTitle>
          </CardHeader>
          <CardContent>
            {!s.plan ? (
              <EmptyState
                title="Bạn chưa có kế hoạch tích lũy vàng"
                description="Tạo kế hoạch để theo dõi ngân sách và tiến độ hàng tháng."
                action={
                  <Button asChild size="sm">
                    <Link to="/assets/gold">Tạo kế hoạch</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Đã tích lũy</span>
                  <span className="font-medium">
                    {formatCurrency(s.goldCost)} /{" "}
                    {formatCurrency(s.plan.targetAmount)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${planProgress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Tiến độ {planProgress}% · Ngân sách dự kiến{" "}
                  {formatCurrency(s.plan.monthlyBudget)} / tháng
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/assets/gold">
                    Xem kế hoạch
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Biến động tài sản</CardTitle>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {([6, 12] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setRange(m)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium",
                  range === m
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {m} tháng
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {snapshotsQ.isLoading ? (
            <div className="h-56 animate-pulse rounded-lg bg-muted" />
          ) : !snapshotsQ.data?.length ? (
            <EmptyState
              title="Chưa có dữ liệu lịch sử"
              description="Biểu đồ sẽ xuất hiện sau khi bạn cập nhật tài sản hoặc ghi nhận mua vàng."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snapshotsQ.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      `${Math.round(Number(v) / 1_000_000)}tr`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalAssets"
                    name="Tổng tài sản"
                    stroke="#334155"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="lentCapital"
                    name="Cho vay"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="availableCash"
                    name="Khả dụng"
                    stroke="#64748b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="goldValue"
                    name="Vàng"
                    stroke="#a16207"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
