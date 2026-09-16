import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  estimateMonthsFromQuantity,
  estimatePhanFromBudget,
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
import { useAssetSummaryQuery } from "@/api/queries";
import { formatCurrency } from "@/lib/currency";
import type { AssetSettings, GoldPlan, GoldPurchase, GoldType } from "@/types/assets";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

const GOLD_TYPE_OPTIONS = (Object.keys(GOLD_TYPE_LABELS) as GoldType[]).filter(
  (t) => t === "9999" || t === "18k" || t === "other",
);

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

  const form = useForm<GoldPlanFormValues>({
    resolver: zodResolver(goldPlanSchema),
    defaultValues: {
      goldType: normalized?.goldType ?? "9999",
      targetQuantity: targetForm.quantity,
      targetUnit: targetForm.unit,
      targetAmount: normalized?.targetAmount,
      hasInitialGold: hasInitialDefault,
      initialQuantity: hasInitialDefault ? initialForm.quantity : undefined,
      initialUnit: initialForm.unit,
      includeInitialQuantity: normalized?.includeInitialQuantity ?? true,
      monthlyBudget: normalized?.monthlyBudget ?? 2_000_000,
      budgetEffectiveFrom: latestBudgetFrom,
      plannedPurchaseDay: normalized?.plannedPurchaseDay ?? 25,
      startMonth: normalized?.startMonth ?? currentMonthKey(),
      endMonth:
        normalized?.endMonth ?? `${new Date().getFullYear() + 1}-12`,
      status: normalized?.status ?? "active",
    },
  });

  const goldType = form.watch("goldType");
  const targetQuantity = form.watch("targetQuantity");
  const targetUnit = form.watch("targetUnit");
  const hasInitialGold = form.watch("hasInitialGold");
  const initialQuantity = form.watch("initialQuantity");
  const initialUnit = form.watch("initialUnit") ?? "chi";
  const includeInitial = form.watch("includeInitialQuantity");
  const startMonth = form.watch("startMonth");
  const monthlyBudget = form.watch("monthlyBudget");

  const targetPhan = toPhan(targetQuantity || 0, targetUnit);
  const initialPhan = hasInitialGold
    ? toPhan(initialQuantity || 0, initialUnit)
    : 0;
  const remainingPreview = Math.max(
    targetPhan - (includeInitial && hasInitialGold ? initialPhan : 0),
    0,
  );

  const pricePerChi = priceService.getCurrentGoldPrice(goldType);
  const estimatedMonthlyPhan = estimatePhanFromBudget(
    monthlyBudget,
    pricePerChi,
  );
  const estimatedMonths =
    estimatedMonthlyPhan != null
      ? estimateMonthsFromQuantity(remainingPreview, estimatedMonthlyPhan)
      : null;

  const prefillPhan = useMemo(() => {
    if (!startMonth) return 0;
    return purchasesBeforeMonth(purchases, startMonth)
      .filter((p) => p.type === goldType)
      .reduce((s, p) => s + p.quantityInPhan, 0);
  }, [purchases, startMonth, goldType]);

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
        if (
          includeInitialQuantity &&
          initialQuantityInPhan >= targetQuantityInPhan
        ) {
          setError("Mục tiêu phải lớn hơn số vàng hiện có");
          return;
        }

        let amount = Math.max(values.monthlyBudget, 1);
        if (values.targetAmount && values.targetAmount > 0) {
          amount = values.targetAmount;
        } else if (normalized?.targetAmount && normalized.targetAmount > 0) {
          amount = normalized.targetAmount;
        }

        try {
          await upsert.mutateAsync({
            targetAmount: amount,
            targetQuantityInPhan,
            goldType: values.goldType,
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
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          <div className="space-y-4">
            <section className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Thông tin mục tiêu</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Số lượng vàng
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="plan-gold-type">Loại vàng mua</Label>
                <select
                  id="plan-gold-type"
                  className={selectClass}
                  {...form.register("goldType")}
                >
                  {GOLD_TYPE_OPTIONS.map((key) => (
                    <option key={key} value={key}>
                      {GOLD_TYPE_LABELS[key]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Giá tham chiếu:{" "}
                  {pricePerChi > 0
                    ? `${formatCurrency(pricePerChi)}/chỉ`
                    : "chưa có — vào Giá tham chiếu để nhập"}
                </p>
              </div>

              <div className="grid grid-cols-[1fr_7rem] gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-target-qty">Mục tiêu</Label>
                  <Input
                    id="plan-target-qty"
                    type="number"
                    step="any"
                    min={0}
                    {...form.register("targetQuantity", {
                      valueAsNumber: true,
                    })}
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
                {formatGoldQuantity(targetPhan)} {GOLD_TYPE_LABELS[goldType]}
              </p>
            </section>

            <section className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Số dư ban đầu</p>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3"
                    variant={hasInitialGold ? "default" : "outline"}
                    onClick={() => form.setValue("hasInitialGold", true)}
                  >
                    Có
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 px-3"
                    variant={!hasInitialGold ? "default" : "outline"}
                    onClick={() => {
                      form.setValue("hasInitialGold", false);
                      form.setValue("includeInitialQuantity", false);
                    }}
                  >
                    Không
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Đã có {GOLD_TYPE_LABELS[goldType]} trước khi bắt đầu kế hoạch?
              </p>
              {hasInitialGold && (
                <div className="space-y-2.5 rounded-lg border p-3">
                  <div className="grid grid-cols-[1fr_7rem] gap-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-initial-qty">Số vàng hiện có</Label>
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
                  <p className="text-xs text-muted-foreground">
                    {formatGoldQuantity(initialPhan)}
                    {includeInitial && targetPhan > 0
                      ? ` · Còn thiếu ${formatGoldQuantity(remainingPreview)}`
                      : ""}
                  </p>
                  {prefillPhan > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-full whitespace-normal text-left text-xs leading-snug"
                      onClick={() => {
                        const q = phanToFormQuantity(prefillPhan);
                        form.setValue("initialQuantity", q.quantity);
                        form.setValue("initialUnit", q.unit);
                        form.setValue("includeInitialQuantity", true);
                      }}
                    >
                      Lấy từ {GOLD_TYPE_LABELS[goldType]} mua trước {startMonth}{" "}
                      ({formatGoldQuantity(prefillPhan)})
                    </Button>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 rounded border"
                      checked={includeInitial}
                      onChange={(e) =>
                        form.setValue(
                          "includeInitialQuantity",
                          e.target.checked,
                        )
                      }
                    />
                    <span>Tính số vàng hiện có vào mục tiêu</span>
                  </label>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <section className="space-y-2.5">
              <p className="text-sm font-medium">Ngân sách</p>
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
                      form.setValue("monthlyBudget", v, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
                {existing && (
                  <div className="space-y-1.5">
                    <Label htmlFor="budget-from">Áp dụng từ tháng</Label>
                    <MonthPicker
                      id="budget-from"
                      value={form.watch("budgetEffectiveFrom") ?? ""}
                      onChange={(v) =>
                        form.setValue("budgetEffectiveFrom", v, {
                          shouldValidate: true,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Tháng ngân sách hiện tại bắt đầu có hiệu lực (trong khoảng
                      Bắt đầu → Kết thúc).
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                {pricePerChi <= 0 ? (
                  <p className="text-muted-foreground">
                    Chưa có giá tham chiếu {GOLD_TYPE_LABELS[goldType]}. Nhập
                    giá tham chiếu để xem ước tính số vàng mua được mỗi tháng.
                  </p>
                ) : estimatedMonthlyPhan == null || estimatedMonthlyPhan <= 0 ? (
                  <p className="text-muted-foreground">
                    Ngân sách chưa đủ mua 1 phân theo giá{" "}
                    {formatCurrency(pricePerChi)}/chỉ.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p>
                      Ước tính mua được{" "}
                      <span className="font-semibold">
                        ~{formatGoldQuantity(estimatedMonthlyPhan)}
                      </span>{" "}
                      {GOLD_TYPE_LABELS[goldType]}/tháng
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Theo giá tham chiếu {formatCurrency(pricePerChi)}/chỉ.
                      {remainingPreview > 0 && estimatedMonths != null
                        ? ` Còn thiếu ${formatGoldQuantity(remainingPreview)} ≈ ${estimatedMonths} tháng (ước tính).`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chỉ mang tính tham khảo — giá thực tế khi mua có thể khác.
                    </p>
                  </div>
                )}
              </div>

              {existing && (
                <p className="text-xs text-muted-foreground">
                  Ngân sách các tháng trước không bị ghi đè.
                </p>
              )}
            </section>

            <section className="space-y-2.5">
              <p className="text-sm font-medium">Ngày nhắc & thời gian</p>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-day">Ngày mua</Label>
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
                  <Label htmlFor="plan-start">Bắt đầu</Label>
                  <MonthPicker
                    id="plan-start"
                    value={form.watch("startMonth")}
                    onChange={(v) =>
                      form.setValue("startMonth", v, { shouldValidate: true })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plan-end">Kết thúc</Label>
                  <MonthPicker
                    id="plan-end"
                    value={form.watch("endMonth")}
                    onChange={(v) =>
                      form.setValue("endMonth", v, { shouldValidate: true })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Bắt đầu / Kết thúc là cửa sổ kế hoạch (tháng tính tiến độ). Ngày
                nhắc chỉ mang tính kế hoạch. Thời gian hoàn thành phụ thuộc vào
                giá vàng và số lượng mua thực tế.
              </p>
            </section>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
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
