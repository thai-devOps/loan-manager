import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/features/finance/components/money-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  categoriesForType,
  PAYMENT_METHODS,
} from "@/features/finance/lib/categories";
import {
  useCreateFinanceTransactionMutation,
  useUpdateFinanceTransactionMutation,
} from "@/api/mutations";
import { todayDateInput } from "@/lib/date";
import {
  financeTransactionSchema,
  type FinanceTransactionFormValues,
} from "@/schemas/finance.schema";
import type {
  FinanceCategory,
  FinanceTransaction,
} from "@/types/finance";

type TransactionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: FinanceTransaction | null;
  defaultType?: "income" | "expense";
  defaultDate?: string;
};

function normalizePaymentMethod(raw?: string): string {
  if (!raw) return "";
  if (raw === "cash" || raw === "Tiền mặt") return "cash";
  if (raw === "transfer" || raw === "Chuyển khoản") return "transfer";
  return "";
}

function buildDefaults(
  editing: FinanceTransaction | null | undefined,
  defaultType: "income" | "expense",
  defaultDate?: string,
): FinanceTransactionFormValues {
  if (editing) {
    return {
      type: editing.type,
      category: editing.category,
      amount: editing.amount,
      date: editing.date,
      description: editing.description,
      note: editing.note ?? "",
      paymentMethod: normalizePaymentMethod(editing.paymentMethod),
    };
  }
  return {
    type: defaultType,
    category: "",
    amount: 0,
    date: defaultDate ?? todayDateInput(),
    description: "",
    note: "",
    paymentMethod: "",
  };
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  editing,
  defaultType = "expense",
  defaultDate,
}: TransactionFormDialogProps) {
  const formKey = editing
    ? `edit-${editing.id}`
    : `new-${defaultType}-${defaultDate ?? "today"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Sửa giao dịch" : "Thêm giao dịch"}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <TransactionFormFields
            key={formKey}
            editing={editing}
            defaultType={defaultType}
            defaultDate={defaultDate}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TransactionFormFields({
  editing,
  defaultType,
  defaultDate,
  onOpenChange,
}: {
  editing?: FinanceTransaction | null;
  defaultType: "income" | "expense";
  defaultDate?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateFinanceTransactionMutation();
  const updateMutation = useUpdateFinanceTransactionMutation();
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(editing);

  const form = useForm<FinanceTransactionFormValues>({
    resolver: zodResolver(financeTransactionSchema),
    defaultValues: buildDefaults(editing, defaultType, defaultDate),
  });

  const type = useWatch({ control: form.control, name: "type" }) ?? defaultType;
  const categories = categoriesForType(type);

  async function onSubmit(values: FinanceTransactionFormValues) {
    setError(null);
    const payload = {
      type: values.type,
      category: values.category as FinanceCategory,
      amount: values.amount,
      date: values.date,
      description: values.description.trim(),
      note: values.note?.trim() || undefined,
      paymentMethod: values.paymentMethod?.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, values: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu giao dịch");
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label>Loại *</Label>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue("category", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Thu nhập</SelectItem>
                <SelectItem value="expense">Chi tiêu</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Danh mục *</Label>
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.category && (
          <p className="text-xs text-destructive">
            {form.formState.errors.category.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="finance-amount">Số tiền *</Label>
        <Controller
          control={form.control}
          name="amount"
          render={({ field }) => (
            <MoneyInput
              id="finance-amount"
              value={field.value}
              onChange={field.onChange}
              placeholder="1.000.000"
            />
          )}
        />
        {form.formState.errors.amount && (
          <p className="text-xs text-destructive">
            {form.formState.errors.amount.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="finance-date">Ngày *</Label>
        <DatePicker
          id="finance-date"
          value={form.watch("date")}
          onChange={(v) => form.setValue("date", v, { shouldValidate: true })}
        />
        {form.formState.errors.date && (
          <p className="text-xs text-destructive">
            {form.formState.errors.date.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="finance-desc">Nội dung *</Label>
        <Input
          id="finance-desc"
          placeholder="Ví dụ: Lương tháng 9"
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p className="text-xs text-destructive">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Phương thức thanh toán</Label>
        <Controller
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <Select
              value={field.value || undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn phương thức" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="finance-note">Ghi chú</Label>
        <Textarea id="finance-note" rows={2} {...form.register("note")} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {isEdit ? "Lưu thay đổi" : "Thêm giao dịch"}
        </Button>
      </DialogFooter>
    </form>
  );
}
