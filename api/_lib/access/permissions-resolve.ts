import { SYSTEM_ROLE_CODES, ALL_PERMISSIONS } from "./catalog.js";
import type { AppRole, AppUser } from "./types.js";
import { rolesCol } from "../mongo.js";

export async function loadRolesByIds(roleIds: string[]): Promise<AppRole[]> {
  if (roleIds.length === 0) return [];
  const col = await rolesCol();
  return col.find({ id: { $in: roleIds }, active: true }).toArray();
}

export async function getEffectivePermissions(
  user: Pick<AppUser, "roleIds">,
): Promise<{ roles: AppRole[]; roleCodes: string[]; permissions: string[] }> {
  const roles = await loadRolesByIds(user.roleIds);
  const roleCodes = roles.map((r) => r.code);

  if (roleCodes.includes(SYSTEM_ROLE_CODES.SUPER_ADMIN)) {
    return {
      roles,
      roleCodes,
      permissions: [...ALL_PERMISSIONS],
    };
  }

  const set = new Set<string>();
  for (const role of roles) {
    for (const p of role.permissions) {
      set.add(p);
    }
  }
  return {
    roles,
    roleCodes,
    permissions: [...set].sort(),
  };
}

export function hasPermission(
  permissions: string[],
  roleCodes: string[],
  required: string | string[],
): boolean {
  if (roleCodes.includes(SYSTEM_ROLE_CODES.SUPER_ADMIN)) return true;
  const needed = Array.isArray(required) ? required : [required];
  return needed.every((p) => permissions.includes(p));
}

export function hasAnyPermission(
  permissions: string[],
  roleCodes: string[],
  required: string[],
): boolean {
  if (roleCodes.includes(SYSTEM_ROLE_CODES.SUPER_ADMIN)) return true;
  return required.some((p) => permissions.includes(p));
}
