import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmptyState, StatCard } from "@/components/common/status-badges";
import { StatCardsSkeleton } from "@/components/common/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAssetAllocationQuery,
} from "@/api/queries";
import { useUpdateAssetSettingsMutation } from "@/api/mutations";
import { formatCurrency } from "@/lib/currency";
import {
  allocationTargetsSchema,
  type AllocationTargetsFormValues,
} from "@/schemas/assets.schema";
import {
  compareTarget,
  targetCompareLabel,
} from "@/features/assets/lib/calculations";
import { cn } from "@/lib/utils";

export function AssetsAllocationPage() {
  const allocationQ = useAssetAllocationQuery();
  const updateSettings = useUpdateAssetSettingsMutation();
  const [editingTargets, setEditingTargets] = useState(false);

  if (allocationQ.isLoading) return <StatCardsSkeleton />;

  if (allocationQ.isError || !allocationQ.data) {
    return (
      <EmptyState
        title="Không thể tải dữ liệu tài sản"
        description="Thử lại sau vài giây."
        action={
          <Button variant="outline" onClick={() => void allocationQ.refetch()}>
            Thử lại
          </Button>
        }
      />
    );
  }

  const a = allocationQ.data;
  const lendingPct =
    a.segments.find((s) => s.key === "lending")?.percent ?? 0;
  const reservePct =
    a.segments.find((s) => s.key === "reserve")?.percent ?? 0;
  const goldPct = a.segments.find((s) => s.key === "gold")?.percent ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Phân bổ vốn</h2>
        <p className="text-sm text-muted-foreground">
          Theo dõi vốn đang được sử dụng và vốn còn khả dụng
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Vốn đang sử dụng"
          value={formatCurrency(a.lentCapital)}
          hint={`Tỷ lệ ${lendingPct}%`}
        />
        <StatCard
          title="Vốn khả dụng"
          value={formatCurrency(a.availableCash)}
          hint={`Tỷ lệ ${reservePct}%`}
        />
        <StatCard
          title="Vốn tích lũy vàng"
          value={formatCurrency(a.goldValue)}
          hint={`Tỷ lệ ${goldPct}%`}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tổng vốn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-2xl font-semibold tabular-nums">
            {formatCurrency(a.totalAssets)}
          </p>
          {a.segments.map((seg) => (
            <div key={seg.key} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{seg.label}</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(seg.amount)} · {seg.percent}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    seg.key === "lending" && "bg-teal-700",
                    seg.key === "reserve" && "bg-slate-500",
                    seg.key === "gold" && "bg-amber-600",
                    seg.key === "other" && "bg-slate-400",
                  )}
                  style={{ width: `${Math.min(seg.percent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">Mục tiêu phân bổ vốn</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Tùy chọn — chỉ để so sánh với phân bổ thực tế
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingTargets((v) => !v)}
          >
            {editingTargets ? "Đóng" : a.targets ? "Sửa mục tiêu" : "Đặt mục tiêu"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {editingTargets && (
            <TargetsForm
              defaults={
                a.targets ?? { lending: 60, reserve: 25, gold: 15 }
              }
              onSave={async (values) => {
                await updateSettings.mutateAsync({
                  allocationTargets: values,
                });
                setEditingTargets(false);
              }}
              onClear={async () => {
                await updateSettings.mutateAsync({ allocationTargets: null });
                setEditingTargets(false);
              }}
              pending={updateSettings.isPending}
            />
          )}

          {!a.targets && !editingTargets && (
            <p className="text-sm text-muted-foreground">
              Chưa đặt mục tiêu phân bổ. Bạn có thể đặt tỷ lệ mong muốn để so
              sánh với thực tế.
            </p>
          )}

          {a.targets && (
            <div className="space-y-3">
              {(
                [
                  { key: "lending", label: "Cho vay", actual: lendingPct },
                  { key: "reserve", label: "Tiền dự phòng", actual: reservePct },
                  { key: "gold", label: "Vàng", actual: goldPct },
                ] as const
              ).map((row) => {
                const target = a.targets![row.key];
                const status = compareTarget(row.actual, target);
                return (
                  <div
                    key={row.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm"
                  >
                    <span className="font-medium">{row.label}</span>
                    <span className="text-muted-foreground">
                      Thực tế: {row.actual}% · Mục tiêu: {target}%
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        status === "met" && "text-emerald-700",
                        status === "below" && "text-amber-700",
                        status === "above" && "text-sky-700",
                      )}
                    >
                      {targetCompareLabel(status)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TargetsForm({
  defaults,
  onSave,
  onClear,
  pending,
}: {
  defaults: AllocationTargetsFormValues;
  onSave: (v: AllocationTargetsFormValues) => Promise<void>;
  onClear: () => Promise<void>;
  pending: boolean;
}) {
  const form = useForm<AllocationTargetsFormValues>({
    resolver: zodResolver(allocationTargetsSchema),
    defaultValues: defaults,
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3 rounded-lg border bg-muted/30 p-3"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        try {
          await onSave(values);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Không thể lưu");
        }
      })}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["lending", "Cho vay %"],
            ["reserve", "Tiền dự phòng %"],
            ["gold", "Vàng %"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`target-${key}`}>{label}</Label>
            <Input
              id={`target-${key}`}
              type="number"
              step="0.1"
              {...form.register(key, { valueAsNumber: true })}
            />
          </div>
        ))}
      </div>
      {form.formState.errors.lending && (
        <p className="text-xs text-destructive">
          {form.formState.errors.lending.message}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Lưu mục tiêu
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => void onClear()}
        >
          Xóa mục tiêu
        </Button>
      </div>
    </form>
  );
}
