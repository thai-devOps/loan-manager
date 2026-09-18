import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminFilterBar,
  filterControlClass,
} from "@/features/ride-admin/components/admin-filter-bar";
import { rideAdminQueryKeys } from "@/features/ride-admin/query-keys";
import { scheduleAdminService } from "@/features/ride-admin/services/admin-api";
import type { ScheduleItem } from "@/features/ride/types/ride";
import { cn } from "@/lib/utils";
import { ApiError } from "@/api/client";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function hmFromMs(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const DAY_START_H = 5;
const DAY_END_H = 23;
const DAY_MINUTES = (DAY_END_H - DAY_START_H) * 60;

function leftPct(startMs: number, dayIso: string): number {
  const dayStart = new Date(`${dayIso}T${String(DAY_START_H).padStart(2, "0")}:00:00`).getTime();
  const mins = (startMs - dayStart) / 60_000;
  return Math.max(0, Math.min(100, (mins / DAY_MINUTES) * 100));
}

function widthPct(startMs: number, endMs: number): number {
  const mins = Math.max(30, (endMs - startMs) / 60_000);
  return Math.max(4, Math.min(100, (mins / DAY_MINUTES) * 100));
}

function itemHref(item: ScheduleItem): string {
  if (item.kind === "trip") return `/admin/trips/${item.id}`;
  return `/admin/bookings/${item.id}`;
}

export function RideAdminSchedulePage() {
  const [params, setParams] = useSearchParams();
  const date = params.get("date") || todayIso();
  const view = params.get("view") === "week" ? "week" : "day";
  const vehicleId = params.get("vehicleId") || "";
  const driverId = params.get("driverId") || "";
  const status = params.get("status") || "";

  const from = view === "week" ? date : date;
  const to = view === "week" ? addDays(date, 6) : date;

  const filters = useMemo(
    () => ({ from, to, vehicleId, driverId, status }),
    [from, to, vehicleId, driverId, status],
  );

  const scheduleQ = useQuery({
    queryKey: rideAdminQueryKeys.schedule(filters),
    queryFn: () =>
      scheduleAdminService.get({
        from,
        to,
        vehicleId: vehicleId || undefined,
        driverId: driverId || undefined,
        status: status || undefined,
      }),
  });

  const data = scheduleQ.data;
  const error =
    scheduleQ.error instanceof ApiError
      ? scheduleQ.error.message
      : scheduleQ.isError
        ? "Không tải được lịch điều phối"
        : null;

  function setDate(next: string) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("date", next);
    setParams(nextParams);
  }

  function setView(next: "day" | "week") {
    const nextParams = new URLSearchParams(params);
    nextParams.set("view", next);
    setParams(nextParams);
  }

  function patchFilter(key: string, value: string) {
    const nextParams = new URLSearchParams(params);
    if (value) nextParams.set(key, value);
    else nextParams.delete(key);
    setParams(nextParams);
  }

  const itemsByVehicle = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const v of data?.vehicles ?? []) map.set(v.id, []);
    map.set("__none__", []);
    for (const item of data?.items ?? []) {
      const key = item.vehicleId || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [data]);

  const itemsByDriver = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const d of data?.drivers ?? []) map.set(d.id, []);
    map.set("__none__", []);
    for (const item of data?.items ?? []) {
      const key = item.driverId || "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [data]);

  const dayList =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(date, i))
      : [date];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lịch điều phối</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi và phân công xe, tài xế cho các chuyến
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-border p-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 rounded-full"
              onClick={() => setDate(addDays(date, view === "week" ? -7 : -1))}
              aria-label="Trước"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full px-3"
              onClick={() => setDate(todayIso())}
            >
              Hôm nay
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 rounded-full"
              onClick={() => setDate(addDays(date, view === "week" ? 7 : 1))}
              aria-label="Sau"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="flex gap-1 rounded-full border border-border p-1">
            {(
              [
                ["day", "Ngày"],
                ["week", "Tuần"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium",
                  view === key
                    ? "bg-teal-800 text-teal-50"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AdminFilterBar>
        <input
          type="date"
          className={filterControlClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          className={filterControlClass}
          value={vehicleId}
          onChange={(e) => patchFilter("vehicleId", e.target.value)}
        >
          <option value="">Tất cả xe</option>
          {(data?.vehicles ?? []).map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <select
          className={filterControlClass}
          value={driverId}
          onChange={(e) => patchFilter("driverId", e.target.value)}
        >
          <option value="">Tất cả tài xế</option>
          {(data?.drivers ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          className={filterControlClass}
          value={status}
          onChange={(e) => patchFilter("status", e.target.value)}
        >
          <option value="">Trạng thái</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="ASSIGNED">Đã phân xe</option>
          <option value="IN_PROGRESS">Đang chạy</option>
        </select>
      </AdminFilterBar>

      {data ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-border px-3 py-1">
            {data.summary.total} chuyến
          </span>
          <span className="rounded-full border border-teal-800/30 bg-teal-50 px-3 py-1 text-teal-900 dark:bg-teal-950 dark:text-teal-100">
            {data.summary.assigned} đã phân
          </span>
          {data.summary.unassigned > 0 ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-50 px-3 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              {data.summary.unassigned} chưa phân xe/tài xế
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={() => void scheduleQ.refetch()}>Thử lại</Button>
        </div>
      ) : null}

      {!data && !error ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : data ? (
        <div className="space-y-8">
          {dayList.map((day) => (
            <DayBoard
              key={day}
              day={day}
              showTitle={view === "week"}
              vehicles={data.vehicles}
              drivers={data.drivers}
              itemsByVehicle={itemsByVehicle}
              itemsByDriver={itemsByDriver}
              dayItems={data.items.filter((i) =>
                i.startAt.startsWith(day) ||
                new Date(i.startMs).toISOString().slice(0, 10) === day ||
                // local date match
                `${new Date(i.startMs).getFullYear()}-${String(new Date(i.startMs).getMonth() + 1).padStart(2, "0")}-${String(new Date(i.startMs).getDate()).padStart(2, "0")}` ===
                  day,
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DayBoard({
  day,
  showTitle,
  vehicles,
  drivers,
  itemsByVehicle,
  itemsByDriver,
  dayItems,
}: {
  day: string;
  showTitle: boolean;
  vehicles: { id: string; name: string; licensePlate?: string }[];
  drivers: { id: string; name: string }[];
  itemsByVehicle: Map<string, ScheduleItem[]>;
  itemsByDriver: Map<string, ScheduleItem[]>;
  dayItems: ScheduleItem[];
}) {
  const [tab, setTab] = useState<"vehicle" | "driver">("vehicle");

  return (
    <section className="space-y-4">
      {showTitle ? (
        <h2 className="text-sm font-semibold text-muted-foreground">
          {formatDayLabel(day)}
        </h2>
      ) : (
        <h2 className="text-base font-semibold">{formatDayLabel(day)}</h2>
      )}

      <div className="flex gap-1 rounded-full border border-border p-1 w-fit">
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            tab === "vehicle"
              ? "bg-teal-800 text-teal-50"
              : "text-muted-foreground",
          )}
          onClick={() => setTab("vehicle")}
        >
          Theo xe
        </button>
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            tab === "driver"
              ? "bg-teal-800 text-teal-50"
              : "text-muted-foreground",
          )}
          onClick={() => setTab("driver")}
        >
          Theo tài xế
        </button>
      </div>

      {/* Mobile list */}
      <ul className="space-y-2 md:hidden">
        {dayItems.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Không có chuyến trong ngày này.
          </li>
        ) : (
          dayItems.map((item) => (
            <ScheduleCard key={`${item.kind}-${item.id}`} item={item} />
          ))
        )}
      </ul>

      {/* Desktop lanes */}
      <div className="hidden space-y-2 md:block">
        <div className="relative mb-1 ml-40 h-5 text-[10px] text-muted-foreground">
          {Array.from({ length: DAY_END_H - DAY_START_H + 1 }, (_, i) => {
            const h = DAY_START_H + i;
            return (
              <span
                key={h}
                className="absolute -translate-x-1/2"
                style={{
                  left: `${(i / (DAY_END_H - DAY_START_H)) * 100}%`,
                }}
              >
                {String(h).padStart(2, "0")}:00
              </span>
            );
          })}
        </div>

        {tab === "vehicle"
          ? [
              ...vehicles.map((v) => ({
                id: v.id,
                label: v.name,
                sub: v.licensePlate,
                items: (itemsByVehicle.get(v.id) ?? []).filter((i) =>
                  dayItems.some((d) => d.id === i.id),
                ),
              })),
              {
                id: "__none__",
                label: "Chưa phân xe",
                sub: undefined as string | undefined,
                items: (itemsByVehicle.get("__none__") ?? []).filter((i) =>
                  dayItems.some((d) => d.id === i.id),
                ),
              },
            ].map((lane) => (
              <LaneRow key={lane.id} day={day} label={lane.label} sub={lane.sub} items={lane.items} />
            ))
          : [
              ...drivers.map((d) => ({
                id: d.id,
                label: d.name,
                items: (itemsByDriver.get(d.id) ?? []).filter((i) =>
                  dayItems.some((x) => x.id === i.id),
                ),
              })),
              {
                id: "__none__",
                label: "Chưa phân tài xế",
                items: (itemsByDriver.get("__none__") ?? []).filter((i) =>
                  dayItems.some((x) => x.id === i.id),
                ),
              },
            ].map((lane) => (
              <LaneRow key={lane.id} day={day} label={lane.label} items={lane.items} />
            ))}
      </div>
    </section>
  );
}

function LaneRow({
  day,
  label,
  sub,
  items,
}: {
  day: string;
  label: string;
  sub?: string;
  items: ScheduleItem[];
}) {
  return (
    <div className="flex min-h-14 items-stretch gap-3 rounded-xl border border-border bg-card">
      <div className="flex w-40 shrink-0 flex-col justify-center border-r border-border px-3 py-2">
        <p className="truncate text-sm font-medium">{label}</p>
        {sub ? (
          <p className="truncate text-xs text-muted-foreground">{sub}</p>
        ) : null}
        {items.length === 0 ? (
          <p className="mt-0.5 text-xs text-muted-foreground">Trống</p>
        ) : null}
      </div>
      <div className="relative min-h-14 flex-1 py-2 pr-3">
        {items.map((item) => (
          <Link
            key={`${item.kind}-${item.id}`}
            to={itemHref(item)}
            className={cn(
              "absolute top-2 flex h-10 flex-col justify-center overflow-hidden rounded-lg border px-2 text-[11px] leading-tight transition-colors",
              item.needsVehicle || item.needsDriver
                ? "border-amber-500/50 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-50"
                : "border-teal-800/30 bg-teal-50 text-teal-950 hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-50",
            )}
            style={{
              left: `${leftPct(item.startMs, day)}%`,
              width: `${Math.min(widthPct(item.startMs, item.endMs), 100 - leftPct(item.startMs, day))}%`,
            }}
            title={`${item.code} · ${item.customerName}`}
          >
            <span className="truncate font-semibold">
              {hmFromMs(item.startMs)}–{hmFromMs(item.endMs)} · #{item.code}
            </span>
            <span className="truncate opacity-80">{item.customerName}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ScheduleCard({ item }: { item: ScheduleItem }) {
  return (
    <li className="rounded-2xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold">#{item.code}</p>
          <p className="mt-1 text-sm">{item.customerName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.pickupAddress} → {item.destinationAddress}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hmFromMs(item.startMs)}–{hmFromMs(item.endMs)} · {item.status}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.needsVehicle || item.needsDriver ? (
          <Button asChild size="sm" className="bg-teal-800 hover:bg-teal-700">
            <Link to={itemHref(item)}>
              {item.needsVehicle ? "Phân xe" : "Phân tài xế"}
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to={itemHref(item)}>Chi tiết</Link>
          </Button>
        )}
      </div>
    </li>
  );
}
