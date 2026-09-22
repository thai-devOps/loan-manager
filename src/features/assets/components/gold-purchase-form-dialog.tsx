import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveFormFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import { MoneyInput } from "@/features/finance/components/money-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  goldPurchaseSchema,
  type GoldPurchaseFormValues,
} from "@/schemas/assets.schema";
import { expectedPurchaseCost } from "@/features/assets/lib/calculations";
import { toPhan } from "@/features/assets/lib/gold-units";
import {
  goldPurchaseLabel,
  mapSourceCodeToGoldType,
} from "@/features/assets/lib/gold-type-catalog";
import { todayDateInput } from "@/lib/date";
import type { GoldPurchase } from "@/types/assets";
import {
  useCreateGoldPurchaseMutation,
  useUpdateGoldPurchaseMutation,
} from "@/api/mutations";
import { useGoldTypesQuery } from "@/api/queries";
import { formatCurrency } from "@/lib/currency";
import type { GoldTypeCatalogItem } from "@/api/endpoints";

export function GoldPurchaseFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GoldPurchase | null;
}) {
  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Sửa giao dịch mua vàng" : "Thêm giao dịch mua vàng"}
      desktopClassName="max-w-md"
    >
      {open && (
        <GoldPurchaseFields
          editing={editing}
          onDone={() => onOpenChange(false)}
        />
      )}
    </ResponsiveFormShell>
  );
}

function GoldPurchaseFields({
  editing,
  onDone,
}: {
  editing: GoldPurchase | null;
  onDone: () => void;
}) {
  const createM = useCreateGoldPurchaseMutation();
  const updateM = useUpdateGoldPurchaseMutation();
  const typesQ = useGoldTypesQuery(true);
  const [error, setError] = useState<string | null>(null);

  const catalog = useMemo(() => {
    const items = typesQ.data?.items ?? [];
    if (!editing?.sourceCode) return items;
    const code = editing.sourceCode.trim();
    if (items.some((i) => i.sourceCode === code)) return items;
    // Keep editing value visible even if catalog refreshed without it
    const orphan: GoldTypeCatalogItem = {
      id: `orphan-${code}`,
      source: "PNJ",
      sourceCode: code,
      sourceName: editing.sourceName?.trim() || code,
      zone: "",
      branch: "",
      lastBuyPricePerChi: editing.purchasePricePerChi,
      lastSellPricePerChi: null,
      lastSourceUpdatedAt: null,
      lastSeenAt: editing.updatedAt,
      createdAt: editing.createdAt,
      updatedAt: editing.updatedAt,
    };
    return [orphan, ...items];
  }, [typesQ.data?.items, editing]);

  const defaultCode =
    editing?.sourceCode?.trim() ||
    (editing?.type === "18k" ? "75" : editing?.type === "9999" ? "N24K" : "") ||
    catalog.find((i) => i.sourceCode === "N24K")?.sourceCode ||
    catalog[0]?.sourceCode ||
    "";

  const form = useForm<GoldPurchaseFormValues>({
    resolver: zodResolver(goldPurchaseSchema),
    defaultValues: editing
      ? {
          sourceCode: editing.sourceCode?.trim() || defaultCode,
          sourceName: editing.sourceName?.trim() || undefined,
          quantity: editing.quantityInPhan / 10,
          unit: "chi",
          purchasePricePerChi: editing.purchasePricePerChi,
          totalCost: editing.totalCost,
          purchaseDate: editing.purchaseDate,
          seller: editing.seller ?? "",
          note: editing.note ?? "",
        }
      : {
          sourceCode: defaultCode,
          sourceName: undefined,
          quantity: 0.1,
          unit: "chi",
          purchasePricePerChi: 0,
          totalCost: 0,
          purchaseDate: todayDateInput(),
          seller: "",
          note: "",
        },
  });

  const quantity = form.watch("quantity");
  const unit = form.watch("unit");
  const price = form.watch("purchasePricePerChi");
  const sourceCode = form.watch("sourceCode");
  const phan = toPhan(quantity || 0, unit);
  const expected = expectedPurchaseCost(phan, price || 0);

  // When catalog loads and create form has empty code, pick default + price
  useEffect(() => {
    if (editing) return;
    if (sourceCode) return;
    const first =
      catalog.find((i) => i.sourceCode === "N24K") ?? catalog[0] ?? null;
    if (!first) return;
    form.setValue("sourceCode", first.sourceCode, { shouldValidate: true });
    form.setValue("sourceName", first.sourceName);
    if (first.lastBuyPricePerChi != null && first.lastBuyPricePerChi > 0) {
      form.setValue("purchasePricePerChi", first.lastBuyPricePerChi, {
        shouldValidate: true,
      });
    }
  }, [catalog, editing, form, sourceCode]);

  useEffect(() => {
    form.setValue("totalCost", expected);
  }, [expected, form]);

  function onSelectType(code: string) {
    const hit = catalog.find((i) => i.sourceCode === code);
    form.setValue("sourceCode", code, { shouldValidate: true });
    form.setValue("sourceName", hit?.sourceName);
    if (hit?.lastBuyPricePerChi != null && hit.lastBuyPricePerChi > 0) {
      form.setValue("purchasePricePerChi", hit.lastBuyPricePerChi, {
        shouldValidate: true,
      });
    }
  }

  async function onSubmit(values: GoldPurchaseFormValues) {
    setError(null);
    const quantityInPhan = toPhan(values.quantity, values.unit);
    if (quantityInPhan <= 0) {
      setError("Khối lượng không hợp lệ");
      return;
    }
    const hit = catalog.find((i) => i.sourceCode === values.sourceCode);
    const sourceName =
      values.sourceName?.trim() || hit?.sourceName || values.sourceCode;
    const payload = {
      type: mapSourceCodeToGoldType(values.sourceCode),
      sourceCode: values.sourceCode,
      sourceName,
      quantityInPhan,
      purchasePricePerChi: values.purchasePricePerChi,
      totalCost:
        values.totalCost ??
        expectedPurchaseCost(quantityInPhan, values.purchasePricePerChi),
      purchaseDate: values.purchaseDate,
      seller: values.seller?.trim() || undefined,
      note: values.note?.trim() || undefined,
    };
    try {
      if (editing) {
        await updateM.mutateAsync({ id: editing.id, values: payload });
      } else {
        await createM.mutateAsync(payload);
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu lần mua");
    }
  }

  const pending = createM.isPending || updateM.isPending;
  const selectedLabel = goldPurchaseLabel({
    sourceCode,
    sourceName:
      form.watch("sourceName") ||
      catalog.find((i) => i.sourceCode === sourceCode)?.sourceName,
    type: mapSourceCodeToGoldType(sourceCode || "other"),
  });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        <div className="space-y-2">
          <Label htmlFor="gold-date">Ngày mua</Label>
          <DatePicker
            id="gold-date"
            value={form.watch("purchaseDate")}
            onChange={(v) =>
              form.setValue("purchaseDate", v, { shouldValidate: true })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gold-type">Loại vàng (PNJ)</Label>
          <select
            id="gold-type"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-base md:text-sm"
            value={sourceCode}
            onChange={(e) => onSelectType(e.target.value)}
            disabled={typesQ.isLoading && catalog.length === 0}
          >
            {catalog.length === 0 ? (
              <option value="">
                {typesQ.isLoading
                  ? "Đang tải loại vàng…"
                  : "Chưa có loại vàng — chạy sync PNJ"}
              </option>
            ) : (
              catalog.map((item) => (
                <option key={item.sourceCode} value={item.sourceCode}>
                  {item.sourceCode} · {item.sourceName}
                  {item.lastBuyPricePerChi != null
                    ? ` · ${formatCurrency(item.lastBuyPricePerChi)}/chỉ`
                    : ""}
                </option>
              ))
            )}
          </select>
          {form.formState.errors.sourceCode && (
            <p className="text-xs text-destructive">
              {form.formState.errors.sourceCode.message}
            </p>
          )}
          {typesQ.isError && (
            <p className="text-xs text-muted-foreground">
              Không tải được danh mục gold_types. Thử sync giá PNJ rồi mở lại.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="gold-qty">Khối lượng</Label>
            <Input
              id="gold-qty"
              type="number"
              step="any"
              {...form.register("quantity", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gold-unit">Đơn vị</Label>
            <select
              id="gold-unit"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-base md:text-sm"
              {...form.register("unit")}
            >
              <option value="cay">Cây</option>
              <option value="chi">Chỉ</option>
              <option value="phan">Phân</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Giá mua / chỉ</Label>
          <MoneyInput
            value={form.watch("purchasePricePerChi")}
            onChange={(v) =>
              form.setValue("purchasePricePerChi", v, { shouldValidate: true })
            }
          />
          <p className="text-xs text-muted-foreground">
            Gợi ý từ PNJ cho {selectedLabel}. Có thể chỉnh lại giá thực mua.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Thành tiền</Label>
          <MoneyInput
            value={form.watch("totalCost") ?? 0}
            onChange={(v) =>
              form.setValue("totalCost", v, { shouldValidate: true })
            }
          />
          <p className="text-xs text-muted-foreground">
            Tính theo khối lượng × giá: {formatCurrency(expected)}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gold-seller">Nơi mua</Label>
          <Input id="gold-seller" {...form.register("seller")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gold-note">Ghi chú</Label>
          <Textarea id="gold-note" rows={2} {...form.register("note")} />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <ResponsiveFormFooter>
        <Button
          type="submit"
          disabled={pending || (!sourceCode && catalog.length === 0)}
        >
          {pending ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm giao dịch"}
        </Button>
      </ResponsiveFormFooter>
    </form>
  );
}
