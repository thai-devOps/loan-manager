import { apiFetch } from "@/api/client";
import type { AppRole, PublicUser } from "@/config/permissions";

export type { AppRole, PublicUser };

export interface UserDetailResponse {
  user: PublicUser;
  roles: AppRole[];
  permissions: string[];
}

export interface PermissionsCatalogResponse {
  modules: { code: string; name: string }[];
  permissions: string[];
  byModule: Record<
    string,
    {
      code: string;
      module: string;
      resource: string;
      action: string;
      label: string;
    }[]
  >;
  presets: Record<string, string[]>;
  meta: {
    code: string;
    module?: string;
    resource?: string;
    resourceLabel?: string;
    action?: string;
    label?: string;
  }[];
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const accessApi = {
  listUsers: (params?: {
    q?: string;
    status?: string;
    roleId?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.status) sp.set("status", params.status);
    if (params?.roleId) sp.set("roleId", params.roleId);
    const qs = sp.toString();
    return apiFetch<{ users: PublicUser[] }>(
      `/api/users${qs ? `?${qs}` : ""}`,
    );
  },

  getUser: (id: string) =>
    apiFetch<UserDetailResponse>(`/api/users/${id}`),

  createUser: (body: {
    name: string;
    email: string;
    username: string;
    password: string;
    roleIds?: string[];
    status?: PublicUser["status"];
  }) =>
    apiFetch<{ user: PublicUser }>("/api/users", {
      method: "POST",
      body,
    }),

  updateUser: (
    id: string,
    body: Partial<{
      name: string;
      email: string;
      username: string;
      status: PublicUser["status"];
      avatarUrl: string | null;
      roleIds: string[];
    }>,
  ) =>
    apiFetch<{ user: PublicUser }>(`/api/users/${id}`, {
      method: "PATCH",
      body,
    }),

  deleteUser: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/users/${id}`, { method: "DELETE" }),

  setUserRoles: (id: string, roleIds: string[]) =>
    apiFetch<{ user: PublicUser }>(`/api/users/${id}/roles`, {
      method: "PATCH",
      body: { roleIds },
    }),

  resetPassword: (id: string, password: string) =>
    apiFetch<{ ok: boolean }>(`/api/users/${id}/reset-password`, {
      method: "POST",
      body: { password },
    }),

  listRoles: () => apiFetch<{ roles: AppRole[] }>("/api/roles"),

  getRole: (id: string) =>
    apiFetch<{ role: AppRole }>(`/api/roles/${id}`),

  createRole: (body: {
    name: string;
    code: string;
    description?: string;
    permissions?: string[];
    active?: boolean;
  }) =>
    apiFetch<{ role: AppRole }>("/api/roles", {
      method: "POST",
      body,
    }),

  updateRole: (
    id: string,
    body: Partial<{
      name: string;
      description: string;
      permissions: string[];
      active: boolean;
    }>,
  ) =>
    apiFetch<{ role: AppRole }>(`/api/roles/${id}`, {
      method: "PATCH",
      body,
    }),

  setRolePermissions: (id: string, permissions: string[]) =>
    apiFetch<{ role: AppRole }>(`/api/roles/${id}/permissions`, {
      method: "PATCH",
      body: { permissions },
    }),

  deleteRole: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/roles/${id}`, { method: "DELETE" }),

  getPermissionsCatalog: () =>
    apiFetch<PermissionsCatalogResponse>("/api/permissions"),

  listAuditLogs: (limit = 100) =>
    apiFetch<{ logs: AuditLogItem[] }>(`/api/audit-logs?limit=${limit}`),
};
