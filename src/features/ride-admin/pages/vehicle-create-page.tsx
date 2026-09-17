import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { vehicleAdminService } from "@/features/ride-admin/services/admin-api";
import {
  emptyVehicleForm,
  formToVehiclePayload,
  VehicleFormFields,
  type VehicleFormState,
} from "@/features/ride-admin/pages/vehicle-form-fields";
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/admin/vehicles">← Xe</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Thêm xe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tạo xe mới cho đội xe riêng có tài xế
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <VehicleFormFields form={form} onChange={setForm} />
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            disabled={busy || !form.name.trim()}
            className="bg-teal-800 hover:bg-teal-700"
            onClick={() => void save()}
          >
            {busy ? "Đang lưu…" : "Lưu xe"}
          </Button>
          <Button asChild variant="outline" disabled={busy}>
            <Link to="/admin/vehicles">Hủy</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
