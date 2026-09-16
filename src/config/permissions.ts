export {
  PERMISSIONS,
  ALL_PERMISSIONS,
  describePermission,
  permissionResourceLabel,
  getPermissionsByModule,
  getViewPermissions,
  getModulePermissions,
  type PermissionCode,
  type PermissionMeta,
} from "@shared/access/permissions";

export {
  MODULES,
  MODULE_CODES,
  type AccessModule,
} from "@shared/access/modules";

export {
  SYSTEM_ROLE_CODES,
  ROLE_SEEDS,
  ROLE_PRESETS,
  expandRolePermissions,
  type SystemRoleCode,
  type RoleSeedDef,
} from "@shared/access/roles";

export type {
  UserStatus,
  PublicUser,
  AppRole,
  AuthMeResponse,
} from "@shared/access/types";
