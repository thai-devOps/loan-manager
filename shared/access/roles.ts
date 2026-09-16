import { ALL_PERMISSIONS, getPermissionsMatching, getViewPermissions } from "./permissions.js";

export const SYSTEM_ROLE_CODES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  FINANCE_MANAGER: "FINANCE_MANAGER",
  ASSET_MANAGER: "ASSET_MANAGER",
  FLEET_MANAGER: "FLEET_MANAGER",
  OPERATOR: "OPERATOR",
  VIEWER: "VIEWER",
} as const;

export type SystemRoleCode =
  (typeof SYSTEM_ROLE_CODES)[keyof typeof SYSTEM_ROLE_CODES];

export interface RoleSeedDef {
  code: SystemRoleCode;
  name: string;
  description: string;
  /** Prefixes like "finance.*" or exact permission codes; expanded at seed. */
  permissionPrefixes: string[];
}

export const ROLE_SEEDS: RoleSeedDef[] = [
  {
    code: SYSTEM_ROLE_CODES.SUPER_ADMIN,
    name: "Super Admin",
    description: "Toàn quyền hệ thống Monely",
    permissionPrefixes: ["*"],
  },
  {
    code: SYSTEM_ROLE_CODES.ADMIN,
    name: "Administrator",
    description: "Quản trị viên — hầu hết quyền trừ một số thao tác nguy hiểm",
    permissionPrefixes: ["*"],
  },
  {
    code: SYSTEM_ROLE_CODES.FINANCE_MANAGER,
    name: "Finance Manager",
    description: "Quản lý tài chính và báo cáo tài chính",
    permissionPrefixes: ["finance.*", "report.finance.*"],
  },
  {
    code: SYSTEM_ROLE_CODES.ASSET_MANAGER,
    name: "Asset Manager",
    description: "Quản lý tài sản, vàng và báo cáo tài sản",
    permissionPrefixes: ["asset.*", "gold.*", "report.asset.*"],
  },
  {
    code: SYSTEM_ROLE_CODES.FLEET_MANAGER,
    name: "Fleet Manager",
    description: "Quản lý vận hành xe, booking, tài xế",
    permissionPrefixes: ["fleet.*", "report.fleet.*"],
  },
  {
    code: SYSTEM_ROLE_CODES.OPERATOR,
    name: "Operator",
    description: "Vận hành hàng ngày — xem và tạo/sửa cơ bản",
    permissionPrefixes: [
      "finance.dashboard.view",
      "finance.transaction.view",
      "finance.transaction.create",
      "finance.transaction.update",
      "asset.dashboard.view",
      "asset.asset.view",
      "asset.asset.create",
      "asset.asset.update",
      "loan.dashboard.view",
      "loan.borrower.view",
      "loan.borrower.create",
      "loan.loan.view",
      "loan.loan.create",
      "loan.payment.view",
      "loan.payment.create",
      "loan.schedule.view",
      "loan.transaction.view",
      "gold.purchase.view",
      "gold.purchase.create",
      "gold.plan.view",
      "fleet.dashboard.view",
      "fleet.booking.view",
      "fleet.booking.create",
      "fleet.booking.update",
      "fleet.vehicle.view",
      "fleet.driver.view",
      "fleet.trip.view",
      "report.loan.view",
    ],
  },
  {
    code: SYSTEM_ROLE_CODES.VIEWER,
    name: "Viewer",
    description: "Chỉ xem — không tạo/sửa/xóa",
    permissionPrefixes: ["view-only"],
  },
];

export function expandRolePermissions(prefixes: string[]): string[] {
  if (prefixes.includes("*")) {
    return [...ALL_PERMISSIONS];
  }
  if (prefixes.includes("view-only")) {
    // Business modules only — never grant IAM / settings to Viewer
    const blocked = new Set(["user", "role", "settings"]);
    return getViewPermissions().filter((p) => {
      const module = p.split(".")[0] ?? "";
      return !blocked.has(module);
    });
  }
  return [...getPermissionsMatching(prefixes)];
}

/** UI presets when creating a custom role (helpers only). */
export const ROLE_PRESETS = {
  Viewer: expandRolePermissions(["view-only"]),
  Operator: expandRolePermissions(
    ROLE_SEEDS.find((r) => r.code === "OPERATOR")!.permissionPrefixes,
  ),
  Manager: expandRolePermissions([
    "finance.*",
    "asset.*",
    "gold.*",
    "loan.*",
    "report.*",
  ]),
  Administrator: [...ALL_PERMISSIONS],
} as const;
