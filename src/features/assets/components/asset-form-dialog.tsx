import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/features/finance/components/money-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  manualAssetSchema,
  type ManualAssetFormValues,
} from "@/schemas/assets.schema";
import {
  ASSET_TYPE_LABELS,
  GOLD_TYPE_LABELS,
  formatGoldQuantity,
  toPhan,
} from "@/features/assets/lib/gold-units";
import { expectedPurchaseCost } from "@/features/assets/lib/calculations";
import { todayDateInput } from "@/lib/date";
import { formatCurrency } from "@/lib/currency";
import type { ManualAsset } from "@/types/assets";
import {
  useCreateManualAssetMutation,
  useUpdateManualAssetMutation,
} from "@/api/mutations";

const TYPE_OPTIONS = Object.entries(ASSET_TYPE_LABELS) as [
  ManualAssetFormValues["type"],
  string,
][];

function defaultGoldDetails(): NonNullable<ManualAssetFormValues["goldDetails"]> {
  return {
    goldType: "9999",
    quantity: 1,
    unit: "chi",
    purchasePricePerChi: 0,
    totalCost: 0,
    seller: "",
  };
}

export function AssetFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ManualAsset | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Sửa tài sản" : "Thêm tài sản"}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <AssetFormFields
            editing={editing}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssetFormFields({
  editing,
  onDone,
}: {
  editing: ManualAsset | null;
  onDone: () => void;
}) {
  const createM = useCreateManualAssetMutation();
  const updateM = useUpdateManualAssetMutation();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ManualAssetFormValues>({
    resolver: zodResolver(manualAssetSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          type: editing.type,
          value: editing.value,
          valuationDate: editing.valuationDate,
          note: editing.note ?? "",
          goldDetails: editing.goldDetails
            ? {
                goldType: editing.goldDetails.goldType,
                quantity: editing.goldDetails.quantityInPhan / 10,
                unit: "chi" as const,
                purchasePricePerChi: editing.goldDetails.purchasePricePerChi,
                totalCost: editing.goldDetails.totalCost,
                seller: editing.goldDetails.seller ?? "",
              }
            : editing.type === "gold"
              ? defaultGoldDetails()
              : undefined,
        }
      : {
          name: "",
          type: "cash",
          value: 0,
          valuationDate: todayDateInput(),
          note: "",
          goldDetails: undefined,
        },
  });

  const assetType = form.watch("type");
  const goldDetails = form.watch("goldDetails");
  const isGold = assetType === "gold";

  useEffect(() => {
    if (isGold && !form.getValues("goldDetails")) {
      form.setValue("goldDetails", defaultGoldDetails());
      if (!form.getValues("name")) {
        form.setValue("name", GOLD_TYPE_LABELS["9999"]);
      }
    }
    if (!isGold) {
      form.setValue("goldDetails", undefined);
    }
  }, [isGold, form]);

  const quantity = goldDetails?.quantity ?? 0;
  const unit = goldDetails?.unit ?? "chi";
  const price = goldDetails?.purchasePricePerChi ?? 0;
  const phan = toPhan(quantity || 0, unit);
  const expected = expectedPurchaseCost(phan, price || 0);

  useEffect(() => {
    if (!isGold || !goldDetails) return;
    if (!editing) {
      form.setValue("goldDetails.totalCost", expected);
      if (form.getValues("value") === 0 || form.getValues("value") === expected) {
        form.setValue("value", expected);
      }
    }
  }, [expected, isGold, goldDetails, editing, form]);

  useEffect(() => {
    if (!isGold || !goldDetails?.goldType) return;
    const label = GOLD_TYPE_LABELS[goldDetails.goldType];
    const currentName = form.getValues("name");
    if (
      !currentName ||
      Object.values(GOLD_TYPE_LABELS).includes(currentName as never)
    ) {
      form.setValue("name", label);
    }
  }, [goldDetails?.goldType, isGold, form]);

  async function onSubmit(values: ManualAssetFormValues) {
    setError(null);
    const payload: Omit<
      ManualAsset,
      "id" | "createdAt" | "updatedAt"
    > = {
      name: values.name.trim(),
      type: values.type,
      value: values.value,
      valuationDate: values.valuationDate,
      note: values.note?.trim() || undefined,
    };

    if (values.type === "gold" && values.goldDetails) {
      const quantityInPhan = toPhan(
        values.goldDetails.quantity,
        values.goldDetails.unit,
      );
      if (quantityInPhan <= 0) {
        setError("Khối lượng vàng không hợp lệ");
        return;
      }
      payload.goldDetails = {
        goldType: values.goldDetails.goldType,
        quantityInPhan,
        purchasePricePerChi: values.goldDetails.purchasePricePerChi,
        totalCost: values.goldDetails.totalCost,
        seller: values.goldDetails.seller?.trim() || undefined,
      };
    }

    try {
      if (editing) {
        await updateM.mutateAsync({ id: editing.id, values: payload });
      } else {
        await createM.mutateAsync(payload);
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu tài sản");
    }
  }

  const pending = createM.isPending || updateM.isPending;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="asset-type">Loại tài sản</Label>
        <select
          id="asset-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          {...form.register("type")}
          disabled={!!editing}
        >
          {TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset-name">Tên tài sản</Label>
        <Input id="asset-name" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {isGold && goldDetails && (
        <div className="space-y-4 rounded-lg border bg-muted/20 p-3">
          <p className="text-sm font-medium">Thông tin vàng</p>

          <div className="space-y-2">
            <Label htmlFor="gold-type">Loại vàng</Label>
            <select
              id="gold-type"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={goldDetails.goldType}
              onChange={(e) =>
                form.setValue(
                  "goldDetails.goldType",
                  e.target.value as "9999" | "18k" | "other",
                  { shouldValidate: true },
                )
              }
            >
              {(
                Object.keys(GOLD_TYPE_LABELS) as Array<
                  keyof typeof GOLD_TYPE_LABELS
                >
              ).map((key) => (
                <option key={key} value={key}>
                  {GOLD_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gold-qty">Khối lượng</Label>
              <Input
                id="gold-qty"
                type="number"
                step="any"
                min={0}
                value={goldDetails.quantity}
                onChange={(e) =>
                  form.setValue(
                    "goldDetails.quantity",
                    Number(e.target.value),
                    { shouldValidate: true },
                  )
                }
              />
              {form.formState.errors.goldDetails?.quantity && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.goldDetails.quantity.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gold-unit">Đơn vị</Label>
              <select
                id="gold-unit"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={goldDetails.unit}
                onChange={(e) =>
                  form.setValue(
                    "goldDetails.unit",
                    e.target.value as "cay" | "chi" | "phan",
                    { shouldValidate: true },
                  )
                }
              >
                <option value="cay">Cây</option>
                <option value="chi">Chỉ</option>
                <option value="phan">Phân</option>
              </select>
            </div>
          </div>
          {phan > 0 && (
            <p className="text-xs text-muted-foreground">
              Quy đổi: {formatGoldQuantity(phan)}
            </p>
          )}

          <div className="space-y-2">
            <Label>Giá mua / chỉ</Label>
            <MoneyInput
              value={goldDetails.purchasePricePerChi}
              onChange={(v) =>
                form.setValue("goldDetails.purchasePricePerChi", v, {
                  shouldValidate: true,
                })
              }
            />
            {form.formState.errors.goldDetails?.purchasePricePerChi && (
              <p className="text-xs text-destructive">
                {
                  form.formState.errors.goldDetails.purchasePricePerChi
                    .message
                }
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Thành tiền đã mua</Label>
            <MoneyInput
              value={goldDetails.totalCost}
              onChange={(v) =>
                form.setValue("goldDetails.totalCost", v, {
                  shouldValidate: true,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Tính theo khối lượng × giá: {formatCurrency(expected)}
            </p>
            {form.formState.errors.goldDetails?.totalCost && (
              <p className="text-xs text-destructive">
                {form.formState.errors.goldDetails.totalCost.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gold-seller">Nơi mua</Label>
            <Input
              id="gold-seller"
              placeholder="Tiệm vàng / ngân hàng..."
              value={goldDetails.seller ?? ""}
              onChange={(e) =>
                form.setValue("goldDetails.seller", e.target.value)
              }
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>{isGold ? "Giá trị ước tính hiện tại" : "Giá trị hiện tại"}</Label>
        <MoneyInput
          value={form.watch("value")}
          onChange={(v) => form.setValue("value", v, { shouldValidate: true })}
        />
        {isGold && (
          <p className="text-xs text-muted-foreground">
            Có thể khác thành tiền đã mua nếu giá tham chiếu thay đổi.
          </p>
        )}
        {form.formState.errors.value && (
          <p className="text-xs text-destructive">
            {form.formState.errors.value.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset-date">
          {isGold ? "Ngày mua / cập nhật" : "Ngày cập nhật"}
        </Label>
        <DatePicker
          id="asset-date"
          value={form.watch("valuationDate")}
          onChange={(v) =>
            form.setValue("valuationDate", v, { shouldValidate: true })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset-note">Ghi chú</Label>
        <Textarea id="asset-note" rows={2} {...form.register("note")} />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm tài sản"}
        </Button>
      </DialogFooter>
    </form>
  );
}
