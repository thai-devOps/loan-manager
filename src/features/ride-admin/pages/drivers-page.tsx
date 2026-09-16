import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { driverAdminService } from "@/features/ride-admin/services/admin-api";
import type { Driver, DriverStatus } from "@/features/ride/types/ride";
import { ApiError } from "@/api/client";

const STATUS_LABEL: Record<DriverStatus, string> = {
  AVAILABLE: "Rảnh",
  ON_TRIP: "Đang chạy",
  OFF: "Nghỉ",
};

const emptyForm = {
  name: "",
  phone: "",
  licenseType: "B2",
  licenseExpiry: "",
  status: "AVAILABLE" as DriverStatus,
  active: true,
};

export function RideAdminDriversPage() {
  const [rows, setRows] = useState<Driver[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setRows(await driverAdminService.list());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải tài xế");
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(d: Driver) {
    setEditing(d);
    setForm({
      name: d.name,
      phone: d.phone,
      licenseType: d.licenseType ?? "B2",
      licenseExpiry: d.licenseExpiry ?? "",
      status: d.status,
      active: d.active,
    });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload = { ...form };
      if (editing) await driverAdminService.update(editing.id, payload);
      else await driverAdminService.create(payload);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lưu thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tài xế</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý tài xế phục vụ chuyến
          </p>
        </div>
        <Button className="bg-teal-800 hover:bg-teal-700" onClick={openCreate}>
          Thêm tài xế
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows === null
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          : rows.length === 0
            ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Chưa có tài xế. Thêm tài xế để phân cho booking.
              </p>
            )
            : rows.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-sm text-muted-foreground">{d.phone}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {STATUS_LABEL[d.status]}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                      Sửa
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/admin/drivers/${d.id}`}>Chi tiết</Link>
                    </Button>
                  </div>
                </div>
              ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa tài xế" : "Thêm tài xế"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Họ tên</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Loại bằng</Label>
              <Input
                value={form.licenseType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, licenseType: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hết hạn bằng</Label>
              <Input
                type="date"
                value={form.licenseExpiry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, licenseExpiry: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as DriverStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as DriverStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={busy || !form.name.trim() || !form.phone.trim()}
              className="bg-teal-800 hover:bg-teal-700"
              onClick={() => void save()}
            >
              Lưu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
