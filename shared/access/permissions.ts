/** Shared Monely permission catalog. Keep in sync across API + frontend. */

export const PERMISSIONS = {
  // Finance
  FINANCE_DASHBOARD_VIEW: "finance.dashboard.view",
  FINANCE_TRANSACTION_VIEW: "finance.transaction.view",
  FINANCE_TRANSACTION_CREATE: "finance.transaction.create",
  FINANCE_TRANSACTION_UPDATE: "finance.transaction.update",
  FINANCE_TRANSACTION_DELETE: "finance.transaction.delete",
  FINANCE_TRANSACTION_EXPORT: "finance.transaction.export",
  FINANCE_REPORT: "finance.report.view",

  // Asset
  ASSET_DASHBOARD_VIEW: "asset.dashboard.view",
  ASSET_ASSET_VIEW: "asset.asset.view",
  ASSET_ASSET_CREATE: "asset.asset.create",
  ASSET_ASSET_UPDATE: "asset.asset.update",
  ASSET_ASSET_DELETE: "asset.asset.delete",

  // Loan
  LOAN_DASHBOARD_VIEW: "loan.dashboard.view",
  LOAN_BORROWER_VIEW: "loan.borrower.view",
  LOAN_BORROWER_CREATE: "loan.borrower.create",
  LOAN_BORROWER_UPDATE: "loan.borrower.update",
  LOAN_BORROWER_DELETE: "loan.borrower.delete",
  LOAN_LOAN_VIEW: "loan.loan.view",
  LOAN_LOAN_CREATE: "loan.loan.create",
  LOAN_LOAN_UPDATE: "loan.loan.update",
  LOAN_LOAN_DELETE: "loan.loan.delete",
  LOAN_PAYMENT_VIEW: "loan.payment.view",
  LOAN_PAYMENT_CREATE: "loan.payment.create",
  LOAN_SCHEDULE_VIEW: "loan.schedule.view",
  LOAN_TRANSACTION_VIEW: "loan.transaction.view",

  // Gold
  GOLD_PURCHASE_VIEW: "gold.purchase.view",
  GOLD_PURCHASE_CREATE: "gold.purchase.create",
  GOLD_PURCHASE_UPDATE: "gold.purchase.update",
  GOLD_PURCHASE_DELETE: "gold.purchase.delete",
  GOLD_PLAN_VIEW: "gold.plan.view",
  GOLD_PLAN_CREATE: "gold.plan.create",
  GOLD_PLAN_UPDATE: "gold.plan.update",
  GOLD_PLAN_DELETE: "gold.plan.delete",

  // Fleet
  FLEET_DASHBOARD_VIEW: "fleet.dashboard.view",
  FLEET_VEHICLE_VIEW: "fleet.vehicle.view",
  FLEET_VEHICLE_CREATE: "fleet.vehicle.create",
  FLEET_VEHICLE_UPDATE: "fleet.vehicle.update",
  FLEET_VEHICLE_DELETE: "fleet.vehicle.delete",
  FLEET_BOOKING_VIEW: "fleet.booking.view",
  FLEET_BOOKING_CREATE: "fleet.booking.create",
  FLEET_BOOKING_UPDATE: "fleet.booking.update",
  FLEET_BOOKING_CANCEL: "fleet.booking.cancel",
  FLEET_TRIP_VIEW: "fleet.trip.view",
  FLEET_TRIP_CREATE: "fleet.trip.create",
  FLEET_TRIP_UPDATE: "fleet.trip.update",
  FLEET_TRIP_COMPLETE: "fleet.trip.complete",
  FLEET_DRIVER_VIEW: "fleet.driver.view",
  FLEET_DRIVER_CREATE: "fleet.driver.create",
  FLEET_DRIVER_UPDATE: "fleet.driver.update",
  FLEET_DRIVER_DELETE: "fleet.driver.delete",

  // Report
  REPORT_FINANCE_VIEW: "report.finance.view",
  REPORT_ASSET_VIEW: "report.asset.view",
  REPORT_FLEET_VIEW: "report.fleet.view",
  REPORT_LOAN_VIEW: "report.loan.view",

  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_UPDATE: "settings.update",

  // User / Role IAM
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  ROLE_VIEW: "role.view",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DELETE: "role.delete",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionCode[] = Object.values(PERMISSIONS);

export interface PermissionMeta {
  code: PermissionCode;
  module: string;
  resource: string;
  action: string;
  label: string;
}

const ACTION_LABELS: Record<string, string> = {
  view: "Xem",
  create: "Tạo",
  update: "Sửa",
  delete: "Xóa",
  export: "Xuất",
  cancel: "Hủy",
  complete: "Hoàn thành",
  approve: "Duyệt",
  report: "Báo cáo",
};

const RESOURCE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  transaction: "Giao dịch",
  asset: "Tài sản",
  borrower: "Người vay",
  loan: "Khoản vay",
  payment: "Thu tiền",
  schedule: "Lịch thu",
  purchase: "Giao dịch vàng",
  plan: "Kế hoạch vàng",
  vehicle: "Xe",
  booking: "Booking",
  trip: "Chuyến xe",
  driver: "Tài xế",
  finance: "Tài chính",
  fleet: "Vận hành xe",
  report: "Báo cáo",
};

export function describePermission(code: string): PermissionMeta | null {
  const parts = code.split(".");
  if (parts.length < 2) return null;
  const module = parts[0] ?? "";
  const action = parts[parts.length - 1] ?? "";
  const resource = parts.length === 2 ? parts[0]! : parts.slice(1, -1).join(".");
  return {
    code: code as PermissionCode,
    module,
    resource,
    action,
    label: ACTION_LABELS[action] ?? action,
  };
}

export function permissionResourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

export function getPermissionsByModule(): Record<string, PermissionMeta[]> {
  const grouped: Record<string, PermissionMeta[]> = {};
  for (const code of ALL_PERMISSIONS) {
    const meta = describePermission(code);
    if (!meta) continue;
    if (!grouped[meta.module]) grouped[meta.module] = [];
    grouped[meta.module]!.push(meta);
  }
  return grouped;
}

/** All view-only permissions (for VIEWER seed). */
export function getViewPermissions(): PermissionCode[] {
  return ALL_PERMISSIONS.filter((p) => p.endsWith(".view"));
}

export function getModulePermissions(moduleCode: string): PermissionCode[] {
  return ALL_PERMISSIONS.filter((p) => p.startsWith(`${moduleCode}.`));
}

export function getPermissionsMatching(
  prefixes: string[],
): PermissionCode[] {
  return ALL_PERMISSIONS.filter((p) =>
    prefixes.some(
      (prefix) =>
        p === prefix ||
        (prefix.endsWith(".*") && p.startsWith(prefix.slice(0, -1))),
    ),
  );
}
