import type { RideVehicle } from "./ride-types.js";

export const MAINTENANCE_WARN_KM = 1000;
export const DOC_WARN_DAYS = 30;

export type FleetReminder = {
  id: string;
  severity: "info" | "warning" | "critical";
  vehicleId: string;
  vehicleName: string;
  message: string;
  kind: "maintenance" | "registration" | "insurance";
};

function daysUntil(isoDate: string, today = new Date()): number {
  const target = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  const start = new Date(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T12:00:00`,
  );
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export function buildFleetReminders(vehicles: RideVehicle[]): FleetReminder[] {
  const out: FleetReminder[] = [];

  for (const v of vehicles) {
    if (!v.active) continue;
    const name = v.name || v.licensePlate || v.id;

    if (
      v.currentOdometer != null &&
      v.nextMaintenanceOdometer != null &&
      Number.isFinite(v.currentOdometer) &&
      Number.isFinite(v.nextMaintenanceOdometer)
    ) {
      const remaining = v.nextMaintenanceOdometer - v.currentOdometer;
      if (remaining <= 0) {
        out.push({
          id: `${v.id}-maint-over`,
          severity: "critical",
          vehicleId: v.id,
          vehicleName: name,
          message: `${name} đã quá hạn bảo dưỡng (${Math.abs(remaining).toLocaleString("vi-VN")} km)`,
          kind: "maintenance",
        });
      } else if (remaining <= MAINTENANCE_WARN_KM) {
        out.push({
          id: `${v.id}-maint-warn`,
          severity: "warning",
          vehicleId: v.id,
          vehicleName: name,
          message: `${name} còn ${remaining.toLocaleString("vi-VN")} km đến kỳ bảo dưỡng`,
          kind: "maintenance",
        });
      }
    }

    if (v.registrationExpiry) {
      const days = daysUntil(v.registrationExpiry);
      if (days < 0) {
        out.push({
          id: `${v.id}-reg-over`,
          severity: "critical",
          vehicleId: v.id,
          vehicleName: name,
          message: `${name} đăng kiểm đã hết hạn`,
          kind: "registration",
        });
      } else if (days <= DOC_WARN_DAYS) {
        out.push({
          id: `${v.id}-reg-warn`,
          severity: "warning",
          vehicleId: v.id,
          vehicleName: name,
          message: `${name} đăng kiểm còn ${days} ngày`,
          kind: "registration",
        });
      }
    }

    for (const ins of v.insurances ?? []) {
      if (!ins.endDate) continue;
      const days = daysUntil(ins.endDate);
      const label = ins.type || "Bảo hiểm";
      if (days < 0) {
        out.push({
          id: `${v.id}-ins-${ins.id}-over`,
          severity: "critical",
          vehicleId: v.id,
          vehicleName: name,
          message: `${name} ${label} đã hết hạn`,
          kind: "insurance",
        });
      } else if (days <= DOC_WARN_DAYS) {
        out.push({
          id: `${v.id}-ins-${ins.id}-warn`,
          severity: "warning",
          vehicleId: v.id,
          vehicleName: name,
          message: `${name} ${label} còn ${days} ngày`,
          kind: "insurance",
        });
      }
    }
  }

  const order = { critical: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
