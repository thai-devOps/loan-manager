import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteIcon, EditIcon } from "@/components/icons";
import { Can } from "@/features/auth/can";
import { ConfirmDeleteDialog } from "@/features/ride-admin/components/confirm-delete-dialog";
import { rideAdminQueryKeys } from "@/features/ride-admin/query-keys";
import { priceMatrixAdminService } from "@/features/ride-admin/services/admin-api";
import { PERMISSIONS } from "@/config/permissions";
import type {
  RidePriceCell,
  RidePriceRoute,
  RidePriceTripType,
  RidePriceVehicleType,
} from "@/features/ride/types/ride";
import { formatCurrency, formatCurrencyInput } from "@/lib/currency";
import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";

type CellKey = string;

function cellKey(
  routeId: string,
  vehicleTypeId: string,
  tripTypeId: string,
): CellKey {
  return `${routeId}:${vehicleTypeId}:${tripTypeId}`;
}

function parseAmountInput(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "").trim();
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function formatAmountField(raw: string): string {
  const amount = parseAmountInput(raw);
  return amount == null ? "" : formatCurrencyInput(amount);
}

function formatDisplayAmount(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) {
    return "Liên hệ";
  }
  return formatCurrency(amount);
}

function RouteFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: RidePriceRoute | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [origin, setOrigin] = useState(initial?.origin ?? "");
  const [destination, setDestination] = useState(initial?.destination ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 100));
  const [error, setError] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = {
        name: name.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        sortOrder: Number(sortOrder) || 100,
      };
      if (initial) {
        return priceMatrixAdminService.updateRoute(initial.id, body);
      }
      return priceMatrixAdminService.createRoute(body);
    },
    onSuccess: () => {
      setError(null);
      toast.success(initial ? "Đã cập nhật tuyến" : "Đã thêm tuyến");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Không lưu được tuyến");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Sửa tuyến" : "Thêm tuyến"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="route-name">Tên tuyến</Label>
            <Input
              id="route-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Long Xuyên ↔ Cần Thơ"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="route-origin">Điểm đi</Label>
              <Input
                id="route-origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Long Xuyên"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-dest">Điểm đến</Label>
              <Input
                id="route-dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Cần Thơ"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="route-sort">Thứ tự</Label>
            <Input
              id="route-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={saveMut.isPending || !name.trim()}
            onClick={() => saveMut.mutate()}
          >
            {saveMut.isPending ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VehicleTypesDialog({
  open,
  onOpenChange,
  vehicles,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicles: RidePriceVehicleType[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [seats, setSeats] = useState("7");
  const [error, setError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      priceMatrixAdminService.createVehicle({
        name: name.trim(),
        seats: Number(seats),
      }),
    onSuccess: () => {
      setName("");
      setSeats("7");
      setError(null);
      toast.success("Đã thêm loại xe");
      onChanged();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Không tạo được loại xe");
    },
  });

  const toggleMut = useMutation({
    mutationFn: (v: RidePriceVehicleType) =>
      priceMatrixAdminService.updateVehicle(v.id, { active: !v.active }),
    onSuccess: () => {
      toast.success("Đã cập nhật loại xe");
      onChanged();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Không cập nhật được");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Loại xe</DialogTitle>
        </DialogHeader>
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {vehicles.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <span>
                {v.name}{" "}
                <span className="text-muted-foreground">({v.seats} chỗ)</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={toggleMut.isPending}
                onClick={() => toggleMut.mutate(v)}
              >
                {v.active ? "Ngừng" : "Bật"}
              </Button>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm font-medium">Thêm loại xe</p>
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-[10rem] flex-1"
              placeholder="Tên (vd. Xe 16 chỗ)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              className="w-24"
              type="number"
              min={1}
              placeholder="Chỗ"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
            <Can permission={PERMISSIONS.FLEET_PRICING_CREATE}>
              <Button
                type="button"
                disabled={createMut.isPending || !name.trim()}
                onClick={() => createMut.mutate()}
              >
                Thêm
              </Button>
            </Can>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TripTypesDialog({
  open,
  onOpenChange,
  tripTypes,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripTypes: RidePriceTripType[];
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});

  const saveMut = useMutation({
    mutationFn: (body: {
      id: string;
      name?: string;
      active?: boolean;
      sortOrder?: number;
    }) => priceMatrixAdminService.updateTripType(body),
    onSuccess: () => {
      toast.success("Đã cập nhật hình thức");
      onChanged();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Không cập nhật được");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setDraftNames({});
          setError(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Hình thức chuyến</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Mã cố định không xóa được. ROUND_TRIP trên booking map tới «Đi về
          trong ngày».
        </p>
        <ul className="space-y-3">
          {tripTypes.map((t) => (
            <li
              key={t.id}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs text-muted-foreground">{t.code}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saveMut.isPending}
                  onClick={() =>
                    saveMut.mutate({ id: t.id, active: !t.active })
                  }
                >
                  {t.active ? "Ngừng" : "Bật"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={draftNames[t.id] ?? t.name}
                  onChange={(e) =>
                    setDraftNames((prev) => ({
                      ...prev,
                      [t.id]: e.target.value,
                    }))
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={saveMut.isPending}
                  onClick={() =>
                    saveMut.mutate({
                      id: t.id,
                      name: (draftNames[t.id] ?? t.name).trim(),
                    })
                  }
                >
                  Lưu
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}

function MatrixEditor({
  route,
  vehicles,
  tripTypes,
  cells,
  onChanged,
}: {
  route: RidePriceRoute;
  vehicles: RidePriceVehicleType[];
  tripTypes: RidePriceTripType[];
  cells: RidePriceCell[];
  onChanged: () => void;
}) {
  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [vehicles],
  );
  const activeTripTypes = useMemo(
    () =>
      tripTypes.filter((t) => t.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [tripTypes],
  );

  const amountByKey = useMemo(() => {
    const map = new Map<CellKey, number>();
    for (const c of cells) {
      if (c.routeId !== route.id || !c.active) continue;
      map.set(cellKey(c.routeId, c.vehicleTypeId, c.tripTypeId), c.amount);
    }
    return map;
  }, [cells, route.id]);

  const [drafts, setDrafts] = useState<Record<CellKey, string>>({});
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<CellKey | null>(null);

  const dirtyKeys = useMemo(
    () => Object.keys(drafts).filter((k) => drafts[k] !== undefined),
    [drafts],
  );

  function displayValue(key: CellKey): string {
    if (drafts[key] !== undefined) return drafts[key];
    const amt = amountByKey.get(key);
    return amt != null ? formatCurrencyInput(amt) : "";
  }

  async function saveOne(key: CellKey, raw: string) {
    const [, vehicleTypeId, tripTypeId] = key.split(":");
    if (!vehicleTypeId || !tripTypeId) return;
    const amount = parseAmountInput(raw);
    const current = amountByKey.get(key) ?? null;
    if (amount === current || (amount == null && current == null)) {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setSavingKey(key);
    setError(null);
    try {
      await priceMatrixAdminService.upsertCell({
        routeId: route.id,
        vehicleTypeId,
        tripTypeId,
        amount,
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success("Đã lưu giá");
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không lưu được ô giá");
    } finally {
      setSavingKey(null);
    }
  }

  const bulkMut = useMutation({
    mutationFn: async () => {
      const payload = dirtyKeys.map((key) => {
        const [, vehicleTypeId, tripTypeId] = key.split(":");
        return {
          routeId: route.id,
          vehicleTypeId,
          tripTypeId,
          amount: parseAmountInput(drafts[key] ?? ""),
        };
      });
      return priceMatrixAdminService.upsertCellsBulk(payload);
    },
    onSuccess: () => {
      setDrafts({});
      setError(null);
      toast.success("Đã áp dụng giá mới");
      onChanged();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Không áp dụng được");
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setPreview((p) => !p)}
        >
          <Eye className="mr-1 size-3.5" />
          {preview ? "Ẩn xem khách" : "Xem như khách"}
        </Button>
        <Can permission={PERMISSIONS.FLEET_PRICING_UPDATE}>
          <Button
            type="button"
            size="sm"
            disabled={bulkMut.isPending || dirtyKeys.length === 0}
            onClick={() => bulkMut.mutate()}
          >
            {bulkMut.isPending
              ? "Đang áp dụng…"
              : `Áp dụng giá mới${dirtyKeys.length ? ` (${dirtyKeys.length})` : ""}`}
          </Button>
        </Can>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {preview ? (
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-teal-800 text-left text-teal-50">
                <th className="px-3 py-2 font-semibold">
                  {route.name}
                </th>
                {activeTripTypes.map((tt) => (
                  <th
                    key={tt.id}
                    className="px-3 py-2 text-center font-semibold"
                  >
                    {tt.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeVehicles.map((v, idx) => (
                <tr
                  key={v.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-stone-50"}
                >
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-semibold"
                  >
                    {v.name}
                  </th>
                  {activeTripTypes.map((tt) => {
                    const key = cellKey(route.id, v.id, tt.id);
                    const amt =
                      drafts[key] !== undefined
                        ? parseAmountInput(drafts[key])
                        : (amountByKey.get(key) ?? null);
                    return (
                      <td
                        key={tt.id}
                        className="px-3 py-2 text-center tabular-nums"
                      >
                        {formatDisplayAmount(amt)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60 text-left">
                <th className="px-3 py-2 font-semibold">Loại xe</th>
                {activeTripTypes.map((tt) => (
                  <th key={tt.id} className="px-3 py-2 text-center font-semibold">
                    {tt.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeVehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTripTypes.length + 1}
                    className="px-3 py-4 text-center text-muted-foreground"
                  >
                    Chưa có loại xe đang bật. Thêm ở «Loại xe».
                  </td>
                </tr>
              ) : (
                activeVehicles.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <th
                      scope="row"
                      className="px-3 py-2 text-left font-medium"
                    >
                      {v.name}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({v.seats} chỗ)
                      </span>
                    </th>
                    {activeTripTypes.map((tt) => {
                      const key = cellKey(route.id, v.id, tt.id);
                      return (
                        <td key={tt.id} className="px-2 py-1.5">
                          <Input
                            className="h-9 text-center tabular-nums"
                            inputMode="numeric"
                            placeholder="Liên hệ"
                            value={displayValue(key)}
                            disabled={savingKey === key}
                            onFocus={(e) => e.currentTarget.select()}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [key]: formatAmountField(e.target.value),
                              }))
                            }
                            onBlur={(e) => {
                              if (drafts[key] === undefined) return;
                              void saveOne(key, e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RideAdminPricingPage() {
  const queryClient = useQueryClient();
  const [routeDialog, setRouteDialog] = useState<{
    open: boolean;
    initial: RidePriceRoute | null;
  }>({ open: false, initial: null });
  const [vehiclesOpen, setVehiclesOpen] = useState(false);
  const [tripTypesOpen, setTripTypesOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<RidePriceRoute | null>(
    null,
  );

  const routesQ = useQuery({
    queryKey: rideAdminQueryKeys.priceRoutes(),
    queryFn: () => priceMatrixAdminService.listRoutes(),
  });
  const vehiclesQ = useQuery({
    queryKey: rideAdminQueryKeys.priceVehicles(),
    queryFn: () => priceMatrixAdminService.listVehicles(),
  });
  const tripTypesQ = useQuery({
    queryKey: rideAdminQueryKeys.priceTripTypes(),
    queryFn: () => priceMatrixAdminService.listTripTypes(),
  });
  const cellsQ = useQuery({
    queryKey: rideAdminQueryKeys.priceCells(),
    queryFn: () => priceMatrixAdminService.listCells(),
  });

  const routes = routesQ.data?.items ?? [];
  const vehicles = vehiclesQ.data?.items ?? [];
  const tripTypes = tripTypesQ.data?.items ?? [];
  const cells = cellsQ.data?.items ?? [];

  const loading =
    routesQ.isLoading ||
    vehiclesQ.isLoading ||
    tripTypesQ.isLoading ||
    cellsQ.isLoading;

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: rideAdminQueryKeys.priceRoutes(),
      }),
      queryClient.invalidateQueries({
        queryKey: rideAdminQueryKeys.priceVehicles(),
      }),
      queryClient.invalidateQueries({
        queryKey: rideAdminQueryKeys.priceTripTypes(),
      }),
      queryClient.invalidateQueries({
        queryKey: rideAdminQueryKeys.priceCells(),
      }),
      queryClient.invalidateQueries({
        queryKey: rideAdminQueryKeys.priceMatrix(),
      }),
    ]);
  }

  const toggleActiveMut = useMutation({
    mutationFn: (route: RidePriceRoute) =>
      priceMatrixAdminService.updateRoute(route.id, { active: !route.active }),
    onSuccess: async () => {
      setPageError(null);
      toast.success("Đã cập nhật trạng thái tuyến");
      await invalidateAll();
    },
    onError: (e) => {
      setPageError(e instanceof ApiError ? e.message : "Không cập nhật được");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => priceMatrixAdminService.deleteRoute(id),
    onSuccess: async () => {
      setPageError(null);
      toast.success("Đã xóa tuyến");
      setDeletingRoute(null);
      await invalidateAll();
    },
    onError: (e) => {
      setPageError(e instanceof ApiError ? e.message : "Không xóa được tuyến");
    },
  });

  let loadError: string | null = pageError;
  for (const q of [routesQ, vehiclesQ, tripTypesQ, cellsQ]) {
    if (q.error instanceof ApiError) loadError = q.error.message;
    else if (q.error) loadError = "Không tải được bảng giá";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">BẢNG GIÁ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Matrix tuyến × loại xe × hình thức. Độc lập với quy tắc km cũ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVehiclesOpen(true)}
          >
            Loại xe
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTripTypesOpen(true)}
          >
            Hình thức
          </Button>
          <Can permission={PERMISSIONS.FLEET_PRICING_CREATE}>
            <Button
              type="button"
              size="sm"
              onClick={() => setRouteDialog({ open: true, initial: null })}
            >
              <Plus className="mr-1 size-4" />
              Thêm tuyến
            </Button>
          </Can>
        </div>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : routes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Chưa có tuyến nào. Thêm tuyến để nhập giá matrix.
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => {
            const isOpen = expanded[route.id] ?? true;
            return (
              <section
                key={route.id}
                className="rounded-xl border border-border bg-card"
              >
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-left font-semibold"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [route.id]: !isOpen,
                      }))
                    }
                  >
                    {isOpen ? (
                      <ChevronDown className="size-4 shrink-0" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0" />
                    )}
                    {route.name}
                  </button>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      route.active
                        ? "bg-teal-100 text-teal-900"
                        : "bg-stone-100 text-stone-600",
                    )}
                  >
                    {route.active ? "Đang dùng" : "Ngừng"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {route.origin} → {route.destination}
                  </span>
                  <div className="ml-auto flex flex-wrap gap-1">
                    <Can permission={PERMISSIONS.FLEET_PRICING_UPDATE}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setRouteDialog({ open: true, initial: route })
                        }
                      >
                        <EditIcon className="size-3.5" />
                        <span className="sr-only">Sửa</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={toggleActiveMut.isPending}
                        onClick={() => toggleActiveMut.mutate(route)}
                      >
                        {route.active ? "Ngừng" : "Bật"}
                      </Button>
                    </Can>
                    <Can permission={PERMISSIONS.FLEET_PRICING_DELETE}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={deleteMut.isPending}
                        onClick={() => setDeletingRoute(route)}
                      >
                        <DeleteIcon className="size-3.5" />
                        <span className="sr-only">Xóa</span>
                      </Button>
                    </Can>
                  </div>
                </div>
                {isOpen ? (
                  <div className="p-4">
                    <MatrixEditor
                      route={route}
                      vehicles={vehicles}
                      tripTypes={tripTypes}
                      cells={cells}
                      onChanged={() => {
                        void invalidateAll();
                      }}
                    />
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <RouteFormDialog
        key={
          routeDialog.open
            ? `route-${routeDialog.initial?.id ?? "new"}`
            : "route-closed"
        }
        open={routeDialog.open}
        initial={routeDialog.initial}
        onOpenChange={(open) =>
          setRouteDialog((prev) => ({ ...prev, open }))
        }
        onSaved={() => {
          void invalidateAll();
        }}
      />
      <VehicleTypesDialog
        open={vehiclesOpen}
        onOpenChange={setVehiclesOpen}
        vehicles={vehicles}
        onChanged={() => {
          void invalidateAll();
        }}
      />
      <TripTypesDialog
        open={tripTypesOpen}
        onOpenChange={setTripTypesOpen}
        tripTypes={tripTypes}
        onChanged={() => {
          void invalidateAll();
        }}
      />

      <ConfirmDeleteDialog
        open={!!deletingRoute}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setDeletingRoute(null);
        }}
        title="Xóa tuyến giá?"
        description={
          deletingRoute
            ? `Xóa tuyến «${deletingRoute.name}» và toàn bộ ô giá liên quan. Thao tác này không thể hoàn tác.`
            : ""
        }
        pending={deleteMut.isPending}
        onConfirm={() => {
          if (!deletingRoute) return;
          deleteMut.mutate(deletingRoute.id);
        }}
      />
    </div>
  );
}
