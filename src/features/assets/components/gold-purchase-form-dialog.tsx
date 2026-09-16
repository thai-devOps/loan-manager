import { useEffect, useState } from "react";
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
import {
  expectedPurchaseCost,
} from "@/features/assets/lib/calculations";
import {
  GOLD_TYPE_LABELS,
  toPhan,
} from "@/features/assets/lib/gold-units";
import { todayDateInput } from "@/lib/date";
import type { GoldPurchase } from "@/types/assets";
import {
  useCreateGoldPurchaseMutation,
  useUpdateGoldPurchaseMutation,
} from "@/api/mutations";
import { formatCurrency } from "@/lib/currency";

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
  const [error, setError] = useState<string | null>(null);

  const form = useForm<GoldPurchaseFormValues>({
    resolver: zodResolver(goldPurchaseSchema),
    defaultValues: editing
      ? {
          type: editing.type,
          quantity: editing.quantityInPhan / 10,
          unit: "chi",
          purchasePricePerChi: editing.purchasePricePerChi,
          totalCost: editing.totalCost,
          purchaseDate: editing.purchaseDate,
          seller: editing.seller ?? "",
          note: editing.note ?? "",
        }
      : {
          type: "9999",
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
  const phan = toPhan(quantity || 0, unit);
  const expected = expectedPurchaseCost(phan, price || 0);

  useEffect(() => {
    if (!editing) {
      form.setValue("totalCost", expected);
    }
  }, [expected, editing, form]);

  async function onSubmit(values: GoldPurchaseFormValues) {
    setError(null);
    const quantityInPhan = toPhan(values.quantity, values.unit);
    if (quantityInPhan <= 0) {
      setError("Khối lượng không hợp lệ");
      return;
    }
    const payload = {
      type: values.type,
      quantityInPhan,
      purchasePricePerChi: values.purchasePricePerChi,
      totalCost: values.totalCost ?? expectedPurchaseCost(quantityInPhan, values.purchasePricePerChi),
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
        <Label htmlFor="gold-type">Loại vàng</Label>
        <select
          id="gold-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-base md:text-sm"
          {...form.register("type")}
        >
          {(Object.keys(GOLD_TYPE_LABELS) as Array<keyof typeof GOLD_TYPE_LABELS>).map(
            (key) => (
              <option key={key} value={key}>
                {GOLD_TYPE_LABELS[key]}
              </option>
            ),
          )}
        </select>
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
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm giao dịch"}
        </Button>
      </ResponsiveFormFooter>
    </form>
  );
}
