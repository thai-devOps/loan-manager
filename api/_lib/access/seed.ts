import { randomUUID } from "node:crypto";
import {
  expandRolePermissions,
  ROLE_SEEDS,
  SYSTEM_ROLE_CODES,
} from "./catalog.js";
import { hashPassword } from "./password.js";
import type { AppRole, AppUser } from "./types.js";
import { getAdminCredentials } from "../auth-credentials.js";
import { rolesCol, usersCol } from "../mongo.js";

export async function ensureAccessControlSeed(): Promise<void> {
  const rCol = await rolesCol();
  const now = new Date().toISOString();

  for (const seed of ROLE_SEEDS) {
    const existing = await rCol.findOne({ code: seed.code });
    const permissions = expandRolePermissions(seed.permissionPrefixes);
    if (!existing) {
      const role: AppRole = {
        id: randomUUID(),
        name: seed.name,
        code: seed.code,
        description: seed.description,
        permissions,
        isSystemRole: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await rCol.insertOne(role);
    } else {
      // Never overwrite customized permissions on login — that reset admin matrix edits.
      // Only keep SUPER_ADMIN in sync with the full catalog.
      const $set: Record<string, unknown> = {
        name: seed.name,
        description: seed.description,
        isSystemRole: true,
        active: true,
        updatedAt: now,
      };
      if (seed.code === SYSTEM_ROLE_CODES.SUPER_ADMIN) {
        $set.permissions = permissions;
      }
      await rCol.updateOne({ code: seed.code }, { $set });
    }
  }

  const uCol = await usersCol();
  const userCount = await uCol.countDocuments();
  if (userCount > 0) return;

  const creds = getAdminCredentials();
  if (!creds) {
    console.warn(
      "[access-control] No users and ADMIN_USERNAME/ADMIN_PASSWORD missing — skip bootstrap user",
    );
    return;
  }

  const superRole = await rCol.findOne({ code: SYSTEM_ROLE_CODES.SUPER_ADMIN });
  if (!superRole) {
    throw new Error("SUPER_ADMIN role missing after seed");
  }

  const passwordHash = await hashPassword(creds.password);
  const user: AppUser = {
    id: randomUUID(),
    name: "Super Admin",
    email: `${creds.username}@monely.local`,
    username: creds.username,
    passwordHash,
    roleIds: [superRole.id],
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  await uCol.insertOne(user);
}
