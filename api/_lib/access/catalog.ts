/** Re-export shared catalog for API (NodeNext). Keep shared/access as source. */
export {
  PERMISSIONS,
  ALL_PERMISSIONS,
  describePermission,
  permissionResourceLabel,
  getPermissionsByModule,
  getViewPermissions,
  getModulePermissions,
  getPermissionsMatching,
  type PermissionCode,
  type PermissionMeta,
} from "../../../shared/access/permissions.js";

export {
  MODULES,
  MODULE_CODES,
  type AccessModule,
} from "../../../shared/access/modules.js";

export {
  SYSTEM_ROLE_CODES,
  ROLE_SEEDS,
  ROLE_PRESETS,
  expandRolePermissions,
  type SystemRoleCode,
  type RoleSeedDef,
} from "../../../shared/access/roles.js";
