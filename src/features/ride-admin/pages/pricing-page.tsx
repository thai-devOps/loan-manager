import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminFilterBar,
  filterControlClass,
} from "@/features/ride-admin/components/admin-filter-bar";
import { PricingStatusBadge } from "@/features/ride-admin/components/pricing-status-badge";
import { StatCard } from "@/features/ride-admin/components/stat-card";
import { PricingRuleFormDialog } from "@/features/ride-admin/pages/pricing-rule-form-dialog";
import { rideAdminQueryKeys } from "@/features/ride-admin/query-keys";
import { pricingRuleAdminService } from "@/features/ride-admin/services/admin-api";
import { Can } from "@/features/auth/can";
import { PERMISSIONS } from "@/config/permissions";
import type {
  PricingCalculateResult,
  PricingRuleType,
  RidePricingRule,
  VehicleCategory,
} from "@/features/ride/types/ride";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { formatRideTimestamp } from "@/features/ride-admin/lib/format";

const TYPE_LABEL: Record<PricingRuleType, string> = {
  ROUTE: "Theo tuyến",
  PER_KM: "Theo km",
  PER_DAY: "Theo ngày",
  AIRPORT: "Sân bay",
  SURCHARGE: "Phụ phí",
};

const VEHICLE_LABEL: Record<VehicleCategory, string> = {
  ANY: "Tất cả xe",
  SEAT_4: "4 chỗ",
  SEAT_7: "7 chỗ",
  SEAT_16: "16 chỗ+",
};

function formulaLabel(rule: RidePricingRule): string {
  const c = rule.pricingConfig || {};
  if (rule.type === "PER_DAY") {
    return `${formatCurrency(c.pricePerDay ?? 0)}/ngày`;
  }
  if (rule.type === "SURCHARGE") {
    if (c.surchargeType === "percentage") {
      return `+${c.surchargePercentage ?? 0}%`;
    }
    return `+${formatCurrency(c.surchargeAmount ?? 0)}`;
  }
  return `${formatCurrency(c.basePrice ?? 0)} + ${formatCurrency(c.pricePerKm ?? 0)}/km`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RideAdminPricingPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RidePricingRule | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [testOrigin, setTestOrigin] = useState("Long Xuyên");
  const [testDest, setTestDest] = useState("Cần Thơ");
  const [testSeats, setTestSeats] = useState("7");
  const [testDate, setTestDate] = useState(todayIso());
  const [testKm, setTestKm] = useState("147.58");
  const [testRound, setTestRound] = useState(true);
  const [testResult, setTestResult] = useState<PricingCalculateResult | null>(
    null,
  );

  const filters = useMemo(() => ({ type, status, q }), [type, status, q]);

  const listQ = useQuery({
    queryKey: rideAdminQueryKeys.pricingRules(filters),
    queryFn: () =>
      pricingRuleAdminService.list({
        type: type || undefined,
        status: status || undefined,
        q: q || undefined,
      }),
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      pricingRuleAdminService.action(id, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: rideAdminQueryKeys.pricingRulesRoot(),
      });
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Thao tác thất bại");
    },
  });

  const data = listQ.data;
  const items = data?.items ?? [];
  const summary = data?.summary;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(rule: RidePricingRule) {
    setEditing(rule);
    setFormOpen(true);
  }

  async function runTest() {
    setError(null);
    setTestResult(null);
    try {
      const seats = Number(testSeats) || 7;
      const vehicleCategory =
        seats <= 4 ? "SEAT_4" : seats <= 7 ? "SEAT_7" : "SEAT_16";
      const result = await pricingRuleAdminService.calculate({
        serviceType: "TRAVEL",
        vehicleCategory,
        origin: testOrigin,
        destination: testDest,
        distanceKm: Number(testKm) || 0,
        roundTrip: testRound,
        date: testDate,
      });
      setTestResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tính được giá");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bảng giá</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý giá dịch vụ và quy tắc tính giá
          </p>
        </div>
        <Can permission={PERMISSIONS.FLEET_PRICING_CREATE}>
          <Button
            className="bg-teal-800 hover:bg-teal-700"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Thêm bảng giá
          </Button>
        </Can>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summary ? (
          <>
            <StatCard label="Tổng bảng giá" value={summary.total} />
            <StatCard label="Đang áp dụng" value={summary.active} />
            <StatCard label="Bản nháp" value={summary.draft} />
            <StatCard label="Hết hạn" value={summary.expired} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))
        )}
      </div>

      <AdminFilterBar>
        <select
          className={filterControlClass}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Tất cả</option>
          <option value="ROUTE">Theo tuyến</option>
          <option value="PER_KM">Theo km</option>
          <option value="PER_DAY">Theo ngày</option>
          <option value="AIRPORT">Sân bay</option>
          <option value="SURCHARGE">Phụ phí</option>
        </select>
        <select
          className={filterControlClass}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Trạng thái</option>
          <option value="ACTIVE">Đang áp dụng</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="ARCHIVED">Lưu trữ</option>
        </select>
        <Input
          className="max-w-xs"
          placeholder="Tìm tên / điểm đón / điểm đến"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </AdminFilterBar>

      <section className="space-y-3">
        {listQ.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Chưa có bảng giá. Tạo bảng giá đầu tiên để bắt đầu.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((rule) => (
              <li
                key={rule.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{rule.name}</h2>
                      <PricingStatusBadge status={rule.status} />
                      <span className="text-xs text-muted-foreground">
                        v{rule.version}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {TYPE_LABEL[rule.type]} ·{" "}
                      {VEHICLE_LABEL[rule.vehicleCategory]} ·{" "}
                      {formulaLabel(rule)}
                    </p>
                    {rule.origin || rule.destination ? (
                      <p className="text-sm">
                        {rule.origin || "?"} → {rule.destination || "?"}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Áp dụng {rule.effectiveFrom}
                      {rule.effectiveTo ? ` → ${rule.effectiveTo}` : " → ∞"} ·
                      cập nhật {formatRideTimestamp(rule.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Can permission={PERMISSIONS.FLEET_PRICING_UPDATE}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(rule)}
                      >
                        Sửa
                      </Button>
                    </Can>
                    <Can permission={PERMISSIONS.FLEET_PRICING_CREATE}>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionMut.isPending}
                        onClick={() =>
                          actionMut.mutate({ id: rule.id, action: "duplicate" })
                        }
                      >
                        Nhân bản
                      </Button>
                    </Can>
                    {rule.status !== "ACTIVE" && rule.status !== "ARCHIVED" ? (
                      <Can permission={PERMISSIONS.FLEET_PRICING_PUBLISH}>
                        <Button
                          size="sm"
                          className="bg-teal-800 hover:bg-teal-700"
                          disabled={actionMut.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Publish "${rule.name}"? Bảng giá sẽ được dùng cho báo giá.`,
                              )
                            ) {
                              actionMut.mutate({
                                id: rule.id,
                                action: "publish",
                              });
                            }
                          }}
                        >
                          Publish
                        </Button>
                      </Can>
                    ) : null}
                    {rule.status !== "ARCHIVED" ? (
                      <Can permission={PERMISSIONS.FLEET_PRICING_UPDATE}>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionMut.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Lưu trữ "${rule.name}"? Không còn dùng cho báo giá.`,
                              )
                            ) {
                              actionMut.mutate({
                                id: rule.id,
                                action: "archive",
                              });
                            }
                          }}
                        >
                          Archive
                        </Button>
                      </Can>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-semibold">Kiểm tra bảng giá</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tính thử trước khi publish — dùng cùng Pricing Engine với Booking
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Điểm đón</Label>
            <Input
              value={testOrigin}
              onChange={(e) => setTestOrigin(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Điểm đến</Label>
            <Input
              value={testDest}
              onChange={(e) => setTestDest(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Số chỗ</Label>
            <Input
              value={testSeats}
              onChange={(e) => setTestSeats(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ngày</Label>
            <Input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Khoảng cách (km)</Label>
            <Input
              value={testKm}
              onChange={(e) => setTestKm(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={testRound}
                onChange={(e) => setTestRound(e.target.checked)}
              />
              Khứ hồi
            </label>
          </div>
        </div>
        <Button
          className="mt-4 bg-teal-800 hover:bg-teal-700"
          onClick={() => void runTest()}
        >
          Tính thử
        </Button>
        {testResult ? (
          <dl className="mt-4 max-w-md space-y-1 text-sm">
            <p className="font-medium">
              Bảng giá được áp dụng: {testResult.matchedRuleName ?? testResult.matchedRuleId}{" "}
              · Version {testResult.version}
            </p>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Giá cơ bản</dt>
              <dd>{formatCurrency(testResult.breakdown.basePrice)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Theo km</dt>
              <dd>{formatCurrency(testResult.breakdown.distancePrice)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Phụ phí</dt>
              <dd>{formatCurrency(testResult.breakdown.surcharges)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-border pt-1 font-semibold">
              <dt>Tổng</dt>
              <dd>{formatCurrency(testResult.breakdown.total)}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <PricingRuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editing}
        onSaved={async () => {
          await queryClient.invalidateQueries({
            queryKey: rideAdminQueryKeys.pricingRulesRoot(),
          });
        }}
      />
    </div>
  );
}
