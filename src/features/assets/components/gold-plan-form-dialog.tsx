import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveFormFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import { MoneyInput } from "@/features/finance/components/money-input";
import { MonthPicker } from "@/components/ui/date-picker";
import {
  goldPlanSchema,
  type GoldPlanFormValues,
} from "@/schemas/assets.schema";
import {
  normalizeGoldPlan,
  phanToFormQuantity,
  purchasesBeforeMonth,
} from "@/features/assets/lib/calculations";
import {
  formatGoldQuantity,
  GOLD_TYPE_LABELS,
  toPhan,
} from "@/features/assets/lib/gold-units";
import { createGoldPriceService } from "@/features/assets/lib/gold-price-service";
import { currentMonthKey } from "@/features/finance/lib/calculations";
import { useUpsertGoldPlanMutation } from "@/api/mutations";
import { useAssetSummaryQuery, useGoldPricesLatestQuery } from "@/api/queries";
import { formatCurrency } from "@/lib/currency";
import type { AssetSettings, GoldPlan, GoldPurchase, GoldType } from "@/types/assets";
import { cn } from "@/lib/utils";
import {
  defaultReferenceSourceCode,
  computeGoldPlanMetrics,
  draftPlanFromForm,
} from "@/features/assets/lib/gold-plan-metrics";
import { resolveReferenceBuyPrice } from "@/features/assets/lib/resolve-reference-price";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-base md:text-sm";

const GOLD_TYPE_OPTIONS = (Object.keys(GOLD_TYPE_LABELS) as GoldType[]).filter(
  (t) => t === "9999" || t === "18k" || t === "other",
);

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${m}/${y}`;
}

export function GoldPlanFormDialog({
  open,
  onOpenChange,
  existing,
  purchases = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: GoldPlan | null;
  purchases?: GoldPurchase[];
}) {
  const summaryQ = useAssetSummaryQuery();
  const prices =
    summaryQ.data?.settings.goldReferencePricePerChi ??
    ({ "9999": 0, "18k": 0, other: 0 } satisfies AssetSettings["goldReferencePricePerChi"]);

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? "Sửa kế hoạch" : "Tạo kế hoạch tích lũy vàng"}
      desktopClassName="w-[calc(100%-1.5rem)] max-w-3xl sm:w-[calc(100%-2rem)]"
    >
      {open && (
        <GoldPlanFormFields
          existing={existing}
          purchases={purchases}
          prices={prices}
          onDone={() => onOpenChange(false)}
        />
      )}
    </ResponsiveFormShell>
  );
}

function GoldPlanFormFields({
  existing,
  purchases,
  prices,
  onDone,
}: {
  existing: GoldPlan | null;
  purchases: GoldPurchase[];
  prices: AssetSettings["goldReferencePricePerChi"];
  onDone: () => void;
}) {
  const upsert = useUpsertGoldPlanMutation();
  const [error, setError] = useState<string | null>(null);
  const priceService = useMemo(() => createGoldPriceService(prices), [prices]);
  const marketQ = useGoldPricesLatestQuery(true);
  const normalized = existing ? normalizeGoldPlan(existing) : null;
  const targetForm = phanToFormQuantity(
    normalized?.targetQuantityInPhan && normalized.targetQuantityInPhan > 0
      ? normalized.targetQuantityInPhan
      : 10 * 10,
  );
  const initialForm = phanToFormQuantity(
    normalized?.initialQuantityInPhan ?? 0,
  );
  const hasInitialDefault =
    (normalized?.initialQuantityInPhan ?? 0) > 0 ||
    Boolean(normalized?.includeInitialQuantity);

  const latestBudgetFrom =
    normalized?.budgetHistory
      ?.slice()
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]
      ?.effectiveFrom ??
    normalized?.startMonth ??
    currentMonthKey();

  const defaultGoldType = normalized?.goldType ?? "9999";
  const form = useForm<GoldPlanFormValues>({
    resolver: zodResolver(goldPlanSchema),
    defaultValues: {
      goldType: defaultGoldType,
      referenceSourceCode:
        normalized?.referenceSourceCode ??
        defaultReferenceSourceCode(defaultGoldType),
      targetQuantity: targetForm.quantity,
      targetUnit: targetForm.unit,
      targetAmount: normalized?.targetAmount,
      hasInitialGold: hasInitialDefault,
      initialQuantity: hasInitialDefault ? initialForm.quantity : undefined,
      initialUnit: initialForm.unit,
      includeInitialQuantity: normalized?.includeInitialQuantity ?? true,
      monthlyBudget: normalized?.monthlyBudget ?? 7_000_000,
      budgetEffectiveFrom: latestBudgetFrom,
      plannedPurchaseDay: normalized?.plannedPurchaseDay ?? 25,
      startMonth: normalized?.startMonth ?? currentMonthKey(),
      endMonth:
        normalized?.endMonth ?? `${new Date().getFullYear() + 1}-12`,
      status: normalized?.status ?? "active",
    },
  });

  const goldType = form.watch("goldType");
  const referenceSourceCode = form.watch("referenceSourceCode");
  const targetQuantity = form.watch("targetQuantity");
  const targetUnit = form.watch("targetUnit");
  const hasInitialGold = form.watch("hasInitialGold");
  const initialQuantity = form.watch("initialQuantity");
  const initialUnit = form.watch("initialUnit") ?? "chi";
  const includeInitial = form.watch("includeInitialQuantity");
  const startMonth = form.watch("startMonth");
  const endMonth = form.watch("endMonth");
  const monthlyBudget = form.watch("monthlyBudget");
  const plannedPurchaseDay = form.watch("plannedPurchaseDay");

  const targetPhan = toPhan(targetQuantity || 0, targetUnit);
  const initialPhan = hasInitialGold
    ? toPhan(initialQuantity || 0, initialUnit)
    : 0;

  const fallbackPrice = priceService.getCurrentGoldPrice(goldType);
  const resolved = resolveReferenceBuyPrice({
    goldType,
    referenceSourceCode,
    market: marketQ.data,
    fallbackPricePerChi: fallbackPrice,
  });
  const pricePerChi = resolved.pricePerChi;

  const liveMetrics = useMemo(() => {
    const draft = draftPlanFromForm({
      goldType,
      referenceSourceCode: referenceSourceCode ?? null,
      targetQuantityInPhan: targetPhan,
      initialQuantityInPhan: initialPhan,
      includeInitialQuantity: Boolean(hasInitialGold && includeInitial),
      monthlyBudget: monthlyBudget || 0,
      plannedPurchaseDay: plannedPurchaseDay || 25,
      startMonth: startMonth || currentMonthKey(),
      endMonth: endMonth || currentMonthKey(),
      existing: normalized,
    });
    return computeGoldPlanMetrics(
      draft,
      existing ? purchases : [],
      pricePerChi,
      currentMonthKey(),
    );
  }, [
    goldType,
    referenceSourceCode,
    targetPhan,
    initialPhan,
    hasInitialGold,
    includeInitial,
    monthlyBudget,
    plannedPurchaseDay,
    startMonth,
    endMonth,
    normalized,
    existing,
    purchases,
    pricePerChi,
  ]);

  const marketOptions = marketQ.data?.prices ?? [];

  const prefillPhan = useMemo(() => {
    if (!startMonth) return 0;
    return purchasesBeforeMonth(purchases, startMonth)
      .filter((p) => p.type === goldType)
      .reduce((s, p) => s + p.quantityInPhan, 0);
  }, [purchases, startMonth, goldType]);

  const unitPreview =
    targetUnit === "cay"
      ? `${targetQuantity || 0} cây = ${formatGoldQuantity(targetPhan)}`
      : targetUnit === "chi"
        ? `${targetQuantity || 0} chỉ = ${formatGoldQuantity(targetPhan)}`
        : formatGoldQuantity(targetPhan);

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const targetQuantityInPhan = toPhan(
          values.targetQuantity,
          values.targetUnit,
        );
        if (targetQuantityInPhan <= 0) {
          setError("Mục tiêu số lượng không hợp lệ");
          return;
        }
        const hasInitial = values.hasInitialGold;
        const initialQuantityInPhan = hasInitial
          ? toPhan(values.initialQuantity || 0, values.initialUnit ?? "chi")
          : 0;
        const includeInitialQuantity =
          hasInitial && values.includeInitialQuantity;

        // Allow existing >= target (goal already met) — do not block save.
        const price = priceService.getCurrentGoldPrice(values.goldType);
        let amount = Math.max(values.monthlyBudget, 1);
        if (values.targetAmount && values.targetAmount > 0) {
          amount = values.targetAmount;
        } else if (price > 0) {
          amount = Math.max(
            1,
            Math.round((targetQuantityInPhan / 10) * price),
          );
        } else if (normalized?.targetAmount && normalized.targetAmount > 0) {
          amount = normalized.targetAmount;
        }

        try {
          await upsert.mutateAsync({
            targetAmount: amount,
            targetQuantityInPhan,
            goldType: values.goldType,
            referenceSourceCode: values.referenceSourceCode ?? null,
            initialQuantityInPhan,
            includeInitialQuantity,
            monthlyBudget: values.monthlyBudget,
            budgetHistory: normalized?.budgetHistory ?? [
              {
                effectiveFrom: values.startMonth,
                monthlyBudget: values.monthlyBudget,
              },
            ],
            budgetEffectiveFrom:
              values.budgetEffectiveFrom ?? currentMonthKey(),
            plannedPurchaseDay: values.plannedPurchaseDay,
            startMonth: values.startMonth,
            endMonth: values.endMonth,
            status: values.status ?? "active",
          });
          onDone();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Không thể lưu");
        }
      })}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
        {/* GROUP 1 — Mục tiêu */}
        <section className="space-y-3 rounded-2xl border border-border/80 p-4">
          <p className="text-sm font-semibold">1. Mục tiêu</p>
          <div className="space-y-1.5">
            <Label htmlFor="plan-gold-type">Loại vàng</Label>
            <select
              id="plan-gold-type"
              className={selectClass}
              {...form.register("goldType", {
                onChange: (e) => {
                  const next = e.target.value as GoldType;
                  form.setValue(
                    "referenceSourceCode",
                    defaultReferenceSourceCode(next),
                  );
                },
              })}
            >
              {GOLD_TYPE_OPTIONS.map((key) => (
                <option key={key} value={key}>
                  {GOLD_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
          {marketOptions.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="plan-ref-code">Giá tham chiếu (PNJ)</Label>
              <select
                id="plan-ref-code"
                className={selectClass}
                value={referenceSourceCode ?? ""}
                onChange={(e) =>
                  form.setValue(
                    "referenceSourceCode",
                    e.target.value || null,
                    { shouldValidate: true },
                  )
                }
              >
                <option value="">— Dùng giá thủ công —</option>
                {marketOptions.map((p) => (
                  <option key={p.sourceCode} value={p.sourceCode}>
                    {p.sourceCode} · {p.sourceName}
                    {p.buyPricePerChi != null
                      ? ` · ${formatCurrency(p.buyPricePerChi)}/chỉ`
                      : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Giá mua vào đang dùng:{" "}
                {pricePerChi > 0 ? formatCurrency(pricePerChi) : "—"}/chỉ
                {resolved.fromMarket ? " (PNJ)" : " (thủ công)"}
              </p>
            </div>
          )}
          <div className="grid grid-cols-[1fr_7rem] gap-2.5">
            <div className="space-y-1.5">
              <Label htmlFor="plan-target-qty">Mục tiêu</Label>
              <Input
                id="plan-target-qty"
                type="number"
                step="any"
                min={0}
                {...form.register("targetQuantity", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-target-unit">Đơn vị</Label>
              <select
                id="plan-target-unit"
                className={selectClass}
                {...form.register("targetUnit")}
              >
                <option value="cay">Cây</option>
                <option value="chi">Chỉ</option>
                <option value="phan">Phân</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Preview: {unitPreview} {GOLD_TYPE_LABELS[goldType]}
          </p>
        </section>

        {/* GROUP 2 — Vàng hiện có */}
        <section className="space-y-3 rounded-2xl border border-border/80 p-4">
          <p className="text-sm font-semibold">2. Vàng hiện có</p>
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border"
              checked={Boolean(hasInitialGold && includeInitial)}
              onChange={(e) => {
                const on = e.target.checked;
                form.setValue("hasInitialGold", on);
                form.setValue("includeInitialQuantity", on);
              }}
            />
            <span>Tính vàng hiện có vào mục tiêu</span>
          </label>

          {hasInitialGold && includeInitial ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-[1fr_7rem] gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-initial-qty">Vàng hiện có</Label>
                  <Input
                    id="plan-initial-qty"
                    type="number"
                    step="any"
                    min={0}
                    {...form.register("initialQuantity", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-initial-unit">Đơn vị</Label>
                  <select
                    id="plan-initial-unit"
                    className={selectClass}
                    {...form.register("initialUnit")}
                  >
                    <option value="cay">Cây</option>
                    <option value="chi">Chỉ</option>
                    <option value="phan">Phân</option>
                  </select>
                </div>
              </div>
              {prefillPhan > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto w-full whitespace-normal py-2 text-left text-xs leading-snug"
                  onClick={() => {
                    const q = phanToFormQuantity(prefillPhan);
                    form.setValue("hasInitialGold", true);
                    form.setValue("initialQuantity", q.quantity);
                    form.setValue("initialUnit", q.unit);
                    form.setValue("includeInitialQuantity", true);
                  }}
                >
                  Lấy từ giao dịch {GOLD_TYPE_LABELS[goldType]} trước{" "}
                  {startMonth} ({formatGoldQuantity(prefillPhan)})
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Đã có {formatGoldQuantity(initialPhan)} · Còn cần{" "}
                {formatGoldQuantity(liveMetrics.remainingPhan)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Vàng hiện có không được tính vào mục tiêu.
            </p>
          )}
        </section>

        {/* GROUP 3 — Ngân sách & thời gian */}
        <section className="space-y-3 rounded-2xl border border-border/80 p-4">
          <p className="text-sm font-semibold">3. Ngân sách & thời gian</p>
          <div
            className={cn(
              "grid gap-2.5",
              existing ? "sm:grid-cols-2" : "grid-cols-1",
            )}
          >
            <div className="space-y-1.5">
              <Label>Ngân sách / tháng</Label>
              <MoneyInput
                value={monthlyBudget}
                onChange={(v) =>
                  form.setValue("monthlyBudget", v, { shouldValidate: true })
                }
              />
            </div>
            {existing && (
              <div className="space-y-1.5">
                <Label htmlFor="budget-from">Áp dụng từ</Label>
                <MonthPicker
                  id="budget-from"
                  value={form.watch("budgetEffectiveFrom") ?? ""}
                  onChange={(v) =>
                    form.setValue("budgetEffectiveFrom", v, {
                      shouldValidate: true,
                    })
                  }
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-day">Ngày nhắc</Label>
              <Input
                id="plan-day"
                type="number"
                min={1}
                max={28}
                {...form.register("plannedPurchaseDay", {
                  valueAsNumber: true,
                })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-start">Áp dụng từ</Label>
              <MonthPicker
                id="plan-start"
                value={form.watch("startMonth")}
                onChange={(v) =>
                  form.setValue("startMonth", v, { shouldValidate: true })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-end">Mục tiêu hoàn thành</Label>
              <MonthPicker
                id="plan-end"
                value={form.watch("endMonth")}
                onChange={(v) =>
                  form.setValue("endMonth", v, { shouldValidate: true })
                }
              />
            </div>
          </div>
        </section>

        {/* Live calculation */}
        <section className="space-y-2 rounded-2xl border border-sky-200/70 bg-sky-50/50 p-4 text-sm dark:border-sky-900/50 dark:bg-sky-950/20">
          <p className="text-sm font-semibold">Ước tính trực tiếp</p>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 sm:text-sm">
            <LiveRow label="Mục tiêu" value={formatGoldQuantity(targetPhan)} />
            <LiveRow
              label="Đã có"
              value={formatGoldQuantity(liveMetrics.existingPhan)}
            />
            <LiveRow
              label="Cần mua"
              value={formatGoldQuantity(liveMetrics.remainingPhan)}
            />
            <LiveRow
              label="Ngân sách"
              value={`${formatCurrency(monthlyBudget || 0)}/tháng`}
            />
            <LiveRow
              label="Ước tính mua"
              value={
                liveMetrics.estimatedMonthlyPhan != null &&
                liveMetrics.estimatedMonthlyPhan > 0
                  ? `~${liveMetrics.estimatedMonthlyPhan.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} phân/tháng`
                  : "—"
              }
            />
            <LiveRow
              label="Thời gian ước tính"
              value={
                liveMetrics.estimatedMonths != null
                  ? `~${liveMetrics.estimatedMonths.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tháng`
                  : "—"
              }
            />
          </div>
          {liveMetrics.estimatedEndMonth && (
            <p className="text-xs text-muted-foreground">
              Dự kiến hoàn thành: ~{formatMonthLabel(liveMetrics.estimatedEndMonth)}{" "}
              (ước tính, không cam kết).
            </p>
          )}
          {!liveMetrics.paceOk && liveMetrics.requiredBudgetPerMonth != null && (
            <div className="flex gap-2 rounded-xl border border-amber-300/70 bg-amber-50/80 px-3 py-2.5 dark:border-amber-800/60 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <div className="min-w-0 space-y-0.5 text-xs">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Ngân sách hiện tại có thể chưa đủ.
                </p>
                <p className="text-amber-800/90 dark:text-amber-300/90">
                  Ngân sách ước tính cần: ~
                  {formatCurrency(liveMetrics.requiredBudgetPerMonth)}/tháng để
                  đạt mục tiêu đúng hạn.
                </p>
              </div>
            </div>
          )}
        </section>

        {error && (
          <p className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <ResponsiveFormFooter>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? "Đang lưu..." : "Lưu kế hoạch"}
        </Button>
      </ResponsiveFormFooter>
    </form>
  );
}

function LiveRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-background/70 px-2.5 py-2 dark:bg-background/40">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-semibold tabular-nums">{value}</p>
    </div>
  );
}
