import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { vehicleAdminService } from "@/features/ride-admin/services/admin-api";
import { VehicleFormFields } from "@/features/ride-admin/pages/vehicle-form-fields";
import {
  emptyVehicleForm,
  formToVehiclePayload,
  type VehicleFormState,
} from "@/features/ride-admin/pages/vehicle-form-state";
import { ApiError } from "@/api/client";

export function RideAdminVehicleCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<VehicleFormState>(emptyVehicleForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên xe");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await vehicleAdminService.create(formToVehiclePayload(form));
      navigate(`/admin/vehicles/${created.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50 via-emerald-50/70 to-sky-50 dark:border-teal-900 dark:from-teal-950/50 dark:via-emerald-950/30 dark:to-sky-950/20">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2 text-teal-800 hover:bg-teal-100/70 hover:text-teal-900 dark:text-teal-200 dark:hover:bg-teal-900/40"
            >
              <Link to="/admin/vehicles">
                <ArrowLeft className="size-4" />
                Xe
              </Link>
            </Button>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-teal-950 dark:text-teal-50 sm:text-2xl">
              Thêm xe
            </h1>
            <p className="mt-1 text-sm text-teal-800/70 dark:text-teal-200/70">
              Tạo xe mới cho đội xe riêng có tài xế
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              size="sm"
              disabled={busy || !form.name.trim()}
              className="bg-teal-800 hover:bg-teal-700"
              onClick={() => void save()}
            >
              {busy ? "Đang lưu…" : "Lưu xe"}
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-teal-200 bg-white/70 dark:border-teal-800 dark:bg-teal-950/40"
            >
              <Link to="/admin/vehicles">Hủy</Link>
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-teal-100 bg-teal-50/80 px-4 py-2.5 dark:border-teal-900/60 dark:bg-teal-950/40">
          <span className="flex size-7 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
            <Car className="size-3.5" />
          </span>
          <h2 className="text-sm font-semibold text-teal-900 dark:text-teal-100">
            Thông tin & giá
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          <VehicleFormFields form={form} onChange={setForm} />
        </div>
      </section>
    </div>
  );
}
