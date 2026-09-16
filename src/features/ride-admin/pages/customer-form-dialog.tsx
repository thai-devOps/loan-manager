import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveFormFooter,
  ResponsiveFormShell,
} from "@/components/ui/responsive-form-shell";
import { customerAdminService } from "@/features/ride-admin/services/admin-api";
import { CUSTOMER_STATUS_LABELS } from "@/features/ride/lib/labels";
import type { RideCustomer, RideCustomerStatus } from "@/features/ride/types/ride";
import {
  rideCustomerFormSchema,
  type RideCustomerFormValues,
} from "@/schemas/ride-customer.schema";
import { ApiError } from "@/api/client";

const emptyDefaults: RideCustomerFormValues = {
  name: "",
  phone: "",
  email: "",
  address: "",
  note: "",
  status: "ACTIVE",
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: RideCustomer | null;
  onSaved: (customer: RideCustomer) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(customer);

  const form = useForm<RideCustomerFormValues>({
    resolver: zodResolver(rideCustomerFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (customer) {
      form.reset({
        name: customer.name,
        phone: customer.phone,
        email: customer.email ?? "",
        address: customer.address ?? "",
        note: customer.note ?? "",
        status: customer.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      });
    } else {
      form.reset(emptyDefaults);
    }
  }, [open, customer, form]);

  async function onSubmit(values: RideCustomerFormValues) {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        address: values.address || undefined,
        note: values.note || undefined,
        status: values.status,
      };
      const saved = customer
        ? await customerAdminService.update(customer.id, payload)
        : await customerAdminService.create(payload);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lưu khách hàng thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ResponsiveFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Sửa khách hàng" : "Thêm khách hàng"}
      desktopClassName="sm:max-w-lg"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="space-y-2">
            <Label htmlFor="name">Họ tên</Label>
            <Input id="name" autoFocus {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input id="phone" inputMode="tel" {...form.register("phone")} />
            {form.formState.errors.phone ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.phone.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input id="address" {...form.register("address")} />
          </div>
          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(v) =>
                form.setValue("status", v as RideCustomerStatus, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CUSTOMER_STATUS_LABELS) as RideCustomerStatus[]).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {CUSTOMER_STATUS_LABELS[s]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" {...form.register("note")} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <ResponsiveFormFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={busy}
            className="bg-teal-800 hover:bg-teal-700"
          >
            {busy ? "Đang lưu…" : isEdit ? "Lưu" : "Thêm khách"}
          </Button>
        </ResponsiveFormFooter>
      </form>
    </ResponsiveFormShell>
  );
}
